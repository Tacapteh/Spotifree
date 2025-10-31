import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

const apiBase = API_BASE.replace(/\/+$/, "");

const apiClient = axios.create({
  baseURL: apiBase,
  timeout: 30000,
});

const VideoDownloader = () => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [downloadReady, setDownloadReady] = useState(false);

  const downloadHref = useMemo(() => {
    if (!downloadReady || !jobId) {
      return "";
    }
    return `${apiBase}/api/audio/download/${jobId}`;
  }, [downloadReady, jobId]);

  useEffect(() => {
    apiClient.get("/api/health").catch(() => {});
  }, []);

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    setDownloadReady(false);
    setJobId(null);
    setStatus("");
    setProgress(0);
    try {
      const res = await apiClient.post("/api/audio/submit", { url });
      setJobId(res.data.audio_id);
      setStatus(res.data.status || "queued");
      setProgress(0);
    } catch (e) {
      setError(`Échec (${e.response?.status || "?"})`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    const id = setInterval(async () => {
      try {
        const res = await apiClient.get(`/api/audio/status/${jobId}`);
        const job = res.data;
        setStatus(job.status);
        setProgress(job.progress || 0);
        if (job.status === "error") {
          setError(job.message || "Erreur lors du traitement");
          clearInterval(id);
        }
        if (job.status === "done") {
          setProgress(job.progress || 100);
          setDownloadReady(true);
          clearInterval(id);
        }
      } catch (e) {
        setError(`Impossible de récupérer le statut (${e.response?.status || "?"})`);
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [jobId]);

  return (
    <div className="w-full px-4 py-6 sm:p-8 max-w-xl mx-auto space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-center sm:text-left">
        Convertisseur Vidéo en MP3
      </h1>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input
          placeholder="URL de la vidéo (YouTube, Vimeo, etc.)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full sm:flex-1"
        />
        <Button
          onClick={handleDownload}
          disabled={!url || loading}
          className="w-full sm:w-auto"
        >
          {loading ? "Téléchargement..." : "Télécharger en MP3"}
        </Button>
      </div>
      {jobId && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-xs text-white/70">{progress}%</p>
        </div>
      )}
      {downloadReady && downloadHref && (
        <a href={downloadHref} rel="noopener" className="btn">
          Télécharger le MP3
        </a>
      )}
      <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg">
        <p className="font-medium text-blue-400 mb-2">
          💡 Conseils pour un téléchargement réussi :
        </p>
        <ul className="text-blue-200 space-y-1 text-xs">
          <li>• Utilisez des vidéos courtes (moins de 10 minutes)</li>
          <li>• Évitez les vidéos avec restrictions géographiques</li>
          <li>• Certaines vidéos populaires peuvent être bloquées</li>
          <li>• Essayez du contenu éducatif ou Creative Commons</li>
        </ul>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default VideoDownloader;
