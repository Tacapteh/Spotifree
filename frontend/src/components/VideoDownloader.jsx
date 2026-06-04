import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, createJob, getJob, getYtDlpInfo } from "../api";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";

const STORAGE_KEY = "spotifree.ytdlp.jobs";
const API_ROOT = API_BASE.replace(/\/+$/, "");

const BITRATES = [128, 192, 256, 320];
const OUTPUT_FORMATS = [
  { id: "mp3", label: "Audio MP3", description: "Extrait la meilleure piste audio puis convertit en MP3." },
  { id: "mp4", label: "Vidéo MP4", description: "Télécharge et fusionne la meilleure vidéo jusqu'à 1080p." },
];

const initialForm = {
  url: "",
  output_format: "mp3",
  bitrate: 192,
};

const formatApiDetail = (detail) => {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (typeof detail === "object") {
    return detail?.error?.message || detail?.message || JSON.stringify(detail);
  }
  return String(detail);
};

const extractApiMessage = (error, fallback) => {
  const detail =
    error?.error?.detail?.error?.message ||
    error?.error?.detail?.message ||
    error?.error?.detail ||
    error?.error?.error?.message ||
    error?.error?.message ||
    error?.message;
  const message = formatApiDetail(detail);
  return message || fallback;
};

const VideoDownloader = () => {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [downloadingJobId, setDownloadingJobId] = useState(null);
  const [toolInfo, setToolInfo] = useState(null);
  const [toolInfoError, setToolInfoError] = useState("");
  const pollers = useRef({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setJobs(parsed);
        }
      }
    } catch (storageError) {
      console.warn("Unable to load stored yt-dlp jobs", storageError);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, 10)));
  }, [jobs]);

  useEffect(() => {
    let mounted = true;
    getYtDlpInfo()
      .then((info) => {
        if (mounted) {
          setToolInfo(info);
          setToolInfoError("");
        }
      })
      .catch((infoError) => {
        if (mounted) {
          setToolInfoError(extractApiMessage(infoError, "yt-dlp est indisponible côté API."));
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(pollers.current).forEach((intervalId) => clearInterval(intervalId));
    };
  }, []);

  useEffect(() => {
    jobs.forEach((job) => {
      if (job.status !== "done" && job.status !== "error") {
        startPolling(job.job_id || job.id);
      }
    });
  }, [jobs]);

  const startPolling = (jobId) => {
    if (!jobId || pollers.current[jobId]) return;

    const tick = async () => {
      try {
        const status = await getJob(jobId);
        updateJob(jobId, status);
        if (status.status === "done" || status.status === "error") {
          stopPolling(jobId);
        }
      } catch (pollError) {
        console.error("Polling error", pollError);
        stopPolling(jobId);
        updateJob(jobId, {
          status: "error",
          message: extractApiMessage(pollError, "Erreur réseau"),
        });
      }
    };

    pollers.current[jobId] = setInterval(tick, 1000);
    tick();
  };

  const stopPolling = (jobId) => {
    const handle = pollers.current[jobId];
    if (handle) {
      clearInterval(handle);
      delete pollers.current[jobId];
    }
  };

  const updateJob = (jobId, patch) => {
    setJobs((prev) => {
      const normalized = prev.map((job) => {
        if ((job.job_id || job.id) !== jobId) return job;
        const merged = { ...job, ...patch };
        merged.job_id = merged.job_id || jobId;
        return merged;
      });
      const exists = normalized.some((job) => (job.job_id || job.id) === jobId);
      if (!exists) {
        normalized.unshift({ job_id: jobId, ...patch });
      }
      return normalized.slice(0, 10);
    });
  };

  const handleInputChange = (field) => (event) => {
    const value = field === "bitrate" ? Number(event.target.value) : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.url.trim()) {
      setError("Veuillez saisir une URL compatible avec yt-dlp.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload = {
        url: form.url.trim(),
        output_format: form.output_format,
        bitrate: form.output_format === "mp3" ? form.bitrate : undefined,
      };
      const result = await createJob(payload);
      const jobId = result.job_id;
      const newJob = {
        job_id: jobId,
        url: payload.url,
        output_format: payload.output_format,
        bitrate: payload.bitrate || form.bitrate,
        status: "queued",
        progress: 0,
        message: "En file d'attente",
        created_at: Date.now(),
      };
      setJobs((prev) => [newJob, ...prev.filter((job) => (job.job_id || job.id) !== jobId)].slice(0, 10));
      setForm((prev) => ({ ...prev, url: "" }));
      startPolling(jobId);
    } catch (submitError) {
      setError(extractApiMessage(submitError, "Échec de la création du job yt-dlp."));
    } finally {
      setSubmitting(false);
    }
  };

  const downloadHref = (jobId) => `${API_ROOT}/api/download/${jobId}`;

  const sanitizeFilename = useMemo(
    () => (name) => {
      const value = `${name ?? ""}`;
      return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]+/g, "")
        .trim()
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    },
    []
  );

  const handleDownload = async (job) => {
    const jobId = job?.job_id || job?.id;
    if (!jobId) return;

    setDownloadingJobId(jobId);
    try {
      updateJob(jobId, { message: "" });

      const response = await fetch(downloadHref(jobId), { mode: "cors" });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(extractApiMessage({ error: errorBody }, "Téléchargement impossible."));
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = response.headers.get("content-disposition") || "";
      let fromHeader = "";
      const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utfMatch?.[1]) {
        try {
          fromHeader = decodeURIComponent(utfMatch[1]);
        } catch (decodeError) {
          fromHeader = utfMatch[1];
        }
      } else {
        const quotedMatch = disposition.match(/filename="?([^";]+)"?/i);
        if (quotedMatch?.[1]) fromHeader = quotedMatch[1];
      }

      const extension = (job.output_format || "mp3").toLowerCase();
      const title = fromHeader || job?.title || job?.url || jobId;
      const safeTitle = sanitizeFilename(title.replace(/\.(mp3|mp4)$/i, "")) || `spotifree-${jobId}`;
      anchor.href = downloadUrl;
      anchor.download = `${safeTitle}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (downloadError) {
      updateJob(jobId, {
        message:
          downloadError?.name === "TypeError"
            ? "Téléchargement impossible (connexion réseau ou CORS)."
            : downloadError?.message || "Échec du téléchargement",
      });
    } finally {
      setDownloadingJobId((current) => (current === jobId ? null : current));
    }
  };

  const selectedFormat = OUTPUT_FORMATS.find((format) => format.id === form.output_format) || OUTPUT_FORMATS[0];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-3xl border border-green-500/20 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-500 text-black hover:bg-green-500">yt-dlp intégré</Badge>
              <Badge variant="outline" className="border-gray-700 text-gray-300">
                {toolInfo?.version ? `version ${toolInfo.version}` : "détection…"}
              </Badge>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Interface yt-dlp</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">
                Collez une URL compatible avec yt-dlp, choisissez une sortie MP3 ou MP4, puis téléchargez le fichier
                généré directement depuis Spotifree.
              </p>
            </div>
          </div>
          <a
            href={toolInfo?.project_url || "https://github.com/yt-dlp/yt-dlp"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:border-green-500 hover:text-green-300"
          >
            Voir le projet GitHub
          </a>
        </div>

        {toolInfoError && (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-100">
            {toolInfoError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-gray-400">URL du média</label>
              <Input
                value={form.url}
                onChange={handleInputChange("url")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSubmit();
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="bg-black/40 border-gray-700 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {OUTPUT_FORMATS.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, output_format: format.id }))}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    form.output_format === format.id
                      ? "border-green-500 bg-green-500/10 text-white"
                      : "border-gray-800 bg-black/30 text-gray-300 hover:border-gray-600"
                  }`}
                >
                  <span className="block text-sm font-semibold">{format.label}</span>
                  <span className="mt-1 block text-xs text-gray-400">{format.description}</span>
                </button>
              ))}
            </div>

            {form.output_format === "mp3" && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-gray-400">Bitrate MP3</label>
                <select
                  className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  value={form.bitrate}
                  onChange={handleInputChange("bitrate")}
                >
                  {BITRATES.map((option) => (
                    <option key={option} value={option}>
                      {option} kbps
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !form.url.trim()}
                className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black font-semibold"
              >
                {submitting ? "Lancement yt-dlp…" : `Télécharger en ${selectedFormat.id.toUpperCase()}`}
              </Button>
              <p className="text-xs text-gray-500">
                yt-dlp tourne côté backend avec ffmpeg pour convertir ou fusionner le fichier final.
              </p>
            </div>

            {error && <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
          </div>

          <div className="rounded-2xl border border-gray-800 bg-black/30 p-4 text-sm text-gray-300 space-y-3">
            <p className="font-semibold text-white">Fonctionnalités activées</p>
            <ul className="space-y-2 text-gray-400">
              <li>• Sortie audio MP3 128/192/256/320 kbps.</li>
              <li>• Sortie vidéo MP4 avec fusion audio/vidéo.</li>
              <li>• Suivi de progression et historique local.</li>
              <li>• Téléchargement direct du fichier généré.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-950/80 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Jobs yt-dlp récents</h2>
        {jobs.length === 0 && (
          <p className="text-sm text-gray-500">Aucun job pour le moment. Lancez un téléchargement pour le voir ici.</p>
        )}
        <div className="space-y-3">
          {jobs.map((job) => {
            const jobId = job.job_id || job.id;
            const isDone = job.status === "done";
            const isError = job.status === "error";
            const isDownloading = downloadingJobId === jobId;
            const extension = (job.output_format || "mp3").toUpperCase();

            return (
              <div key={jobId} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white break-words">{job.title || job.url}</p>
                    <p className="text-xs text-gray-500 break-all">{job.url}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Sortie&nbsp;: {extension}{job.output_format === "mp3" ? ` · ${job.bitrate || 192} kbps` : " · vidéo 1080p max"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      isDone ? "text-green-400" : isError ? "text-red-400" : "text-blue-300"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <Progress value={job.progress || 0} className="h-2" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-400 gap-2">
                    <span>{job.progress ? `${job.progress}%` : "En attente…"}</span>
                    <span className={isError ? "text-red-300" : "text-gray-500"}>{job.message}</span>
                  </div>
                </div>

                {isDone && (
                  <button
                    type="button"
                    onClick={() => handleDownload(job)}
                    disabled={isDownloading}
                    className="inline-flex items-center justify-center rounded-md border border-green-500/70 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-300 hover:bg-green-500/20 disabled:opacity-50"
                  >
                    {isDownloading ? "Téléchargement…" : `Télécharger le ${extension}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VideoDownloader;
