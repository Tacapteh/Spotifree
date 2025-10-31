import React, { useEffect, useRef, useState } from "react";
import { API_BASE, createJob, getJob } from "../api";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

const STORAGE_KEY = "spotifree.jobs";
const API_ROOT = API_BASE.replace(/\/+$/, "");

const BITRATES = [128, 192, 256, 320];

const initialForm = {
  url: "",
  bitrate: 192,
  title: "",
  artist: "",
  album: "",
};

const VideoDownloader = () => {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState([]);
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
      console.warn("Unable to load stored jobs", storageError);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const snapshot = jobs.slice(0, 10);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [jobs]);

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
    if (!jobId || pollers.current[jobId]) {
      return;
    }
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
          message: pollError?.error?.error?.message || "Erreur réseau",
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
    if (!form.url) {
      setError("Veuillez saisir une URL valide.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        url: form.url,
        bitrate: form.bitrate,
        title: form.title || undefined,
        artist: form.artist || undefined,
        album: form.album || undefined,
      };
      const result = await createJob(payload);
      const jobId = result.job_id;
      const newJob = {
        job_id: jobId,
        url: form.url,
        bitrate: form.bitrate,
        status: "queued",
        progress: 0,
        message: "En file d'attente",
        created_at: Date.now(),
      };
      setJobs((prev) => [newJob, ...prev.filter((job) => (job.job_id || job.id) !== jobId)].slice(0, 10));
      startPolling(jobId);
    } catch (submitError) {
      const message =
        submitError?.error?.error?.message ||
        submitError?.error?.message ||
        submitError?.message ||
        "Échec de la création du job.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadHref = (jobId) => `${API_ROOT}/api/download/${jobId}`;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 shadow-lg space-y-6">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-white">Convertisseur vidéo vers MP3</h1>
          <p className="text-sm text-gray-400">
            Collez un lien vers une vidéo compatible, choisissez un bitrate, puis suivez la conversion en temps réel.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-gray-400">URL de la vidéo</label>
            <Input
              value={form.url}
              onChange={handleInputChange("url")}
              placeholder="https://www.youtube.com/watch?v=..."
              className="bg-black/40 border-gray-700 focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-gray-400">Bitrate</label>
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

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-gray-400">Titre (facultatif)</label>
              <Input
                value={form.title}
                onChange={handleInputChange("title")}
                placeholder="Titre personnalisé"
                className="bg-black/40 border-gray-700 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-gray-400">Artiste (facultatif)</label>
              <Input
                value={form.artist}
                onChange={handleInputChange("artist")}
                placeholder="Nom de l'artiste"
                className="bg-black/40 border-gray-700 focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-gray-400">Album (facultatif)</label>
            <Input
              value={form.album}
              onChange={handleInputChange("album")}
              placeholder="Nom de l'album"
              className="bg-black/40 border-gray-700 focus:border-green-500 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !form.url}
            className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black font-semibold"
          >
            {submitting ? "Conversion en cours…" : "Convertir en MP3"}
          </Button>
          <p className="text-xs text-gray-500">
            Les conversions sont traitées par notre backend Render sécurisé avec sortie MP3 téléchargeable.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Historique des conversions</h2>
        {jobs.length === 0 && (
          <p className="text-sm text-gray-500">
            Les jobs récents apparaîtront ici. Vous pourrez reprendre vos téléchargements terminés à tout moment.
          </p>
        )}
        <div className="space-y-3">
          {jobs.map((job) => {
            const jobId = job.job_id || job.id;
            const isDone = job.status === "done";
            const isError = job.status === "error";
            const href = isDone ? downloadHref(jobId) : null;

            return (
              <div
                key={jobId}
                className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-3 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white break-words">{job.url}</p>
                    <p className="text-xs text-gray-500">Bitrate&nbsp;: {job.bitrate} kbps</p>
                  </div>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      isDone
                        ? "text-green-400"
                        : isError
                        ? "text-red-400"
                        : "text-blue-300"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <Progress value={job.progress || 0} className="h-2" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-400 gap-2">
                    <span>{job.progress ? `${job.progress}%` : "En attente…"}</span>
                    <span className="text-gray-500">{job.message}</span>
                  </div>
                </div>

                {isDone && href && (
                  <a
                    href={href}
                    rel="noopener"
                    className="inline-flex items-center justify-center rounded-md border border-green-500/70 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-300 hover:bg-green-500/20"
                  >
                    Télécharger le MP3
                  </a>
                )}

                {isError && job.message && (
                  <p className="text-xs text-red-300">{job.message}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
        <p className="font-semibold mb-2">Conseils rapides :</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Évitez les vidéos protégées (DRM) ou diffusées en direct.</li>
          <li>Les conversions prennent généralement moins d'une minute.</li>
          <li>Depuis Vercel, vérifiez que la requête part bien vers Render (200 OK, sans redirection).</li>
        </ul>
      </div>
    </div>
  );
};

export default VideoDownloader;
