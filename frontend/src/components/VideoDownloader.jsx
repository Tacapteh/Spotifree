import { api } from "../lib/api";
import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

const VideoDownloader = () => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioId, setAudioId] = useState(null);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    api.get("/api/health").catch(() => {});
  }, []);

  const downloadFile = async (id) => {
    try {
      const res = await api.get(`/api/audio/download/${id}`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${id}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError(`Téléchargement échoué (${e.response?.status || "?"})`);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/audio/submit", { url });
      setAudioId(res.data.audio_id);
      setStatus(res.data.status);
      setProgress(0);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || "Création du job échouée";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!audioId) return;
    if (status === "done" || status === "error") return;
    const id = setInterval(async () => {
      try {
        const res = await api.get(`/api/audio/status/${audioId}`);
        setStatus(res.data.status);
        setProgress(res.data.progress || 0);
        if (res.data.status === "error") {
          setError(res.data.message || "Erreur lors du traitement");
        }
        if (res.data.status === "done") {
          downloadFile(audioId);
        }
      } catch (_e) {
        setError("Impossible de récupérer le statut");
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [audioId, status]);

  return (
    <div className="p-8 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Convertisseur Vidéo en MP3</h1>
      <div className="flex gap-2">
        <Input
          placeholder="URL de la vidéo (YouTube, Vimeo, etc.)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleDownload} disabled={!url || loading}>
          {loading ? "Téléchargement..." : "Télécharger en MP3"}
        </Button>
      </div>
      {audioId && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-xs text-white/70">{progress}%</p>
        </div>
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
