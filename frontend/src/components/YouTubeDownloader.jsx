import React, { useState } from "react";
import axios from "axios";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const YouTubeDownloader = () => {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError("");
    setInfo(null);
    try {
      const res = await axios.post("/api/youtube/info", { url });
      setInfo(res.data);
    } catch (e) {
      let errorMessage = "Analyse échouée";
      if (e.response?.data?.detail) {
        errorMessage = e.response.data.detail;
      } else if (e.response?.status === 403) {
        errorMessage = "YouTube a bloqué cette requête. Essayez plus tard.";
      } else if (e.response?.status === 429) {
        errorMessage = "Trop de requêtes. Attendez quelques minutes.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        "/api/youtube/download",
        { url },
        { responseType: "blob" },
      );
      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      const filename = info?.title ? `${info.title}.mp3` : "audio.mp3";
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      let errorMessage = "Téléchargement échoué";
      if (e.response?.data?.detail) {
        errorMessage = e.response.data.detail;
      } else if (e.response?.status === 403) {
        errorMessage = "YouTube a bloqué cette requête. Essayez plus tard.";
      } else if (e.response?.status === 429) {
        errorMessage = "Trop de requêtes. Attendez quelques minutes.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Téléchargeur YouTube</h1>
      <div className="flex gap-2">
        <Input
          placeholder="URL YouTube"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleAnalyze} disabled={!url || loading}>
          Analyser
        </Button>
      </div>
      <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg">
        <p className="font-medium text-blue-400 mb-2">
          💡 Conseils pour un téléchargement réussi :
        </p>
        <ul className="text-blue-200 space-y-1 text-xs">
          <li>• Utilisez des vidéos courtes (moins de 10 minutes)</li>
          <li>• Évitez les vidéos avec restrictions géographiques</li>
          <li>• Les vidéos musicales populaires peuvent être bloquées</li>
          <li>• Essayez du contenu éducatif ou Creative Commons</li>
        </ul>
      </div>
      {info && (
        <div className="p-4 bg-gray-800 rounded">
          <p className="font-medium">{info.title}</p>
          {info.duration && (
            <p className="text-sm text-gray-400">Durée: {info.duration}s</p>
          )}
        </div>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {info && (
        <Button onClick={handleDownload} disabled={loading}>
          {loading ? "Téléchargement..." : "Télécharger en MP3"}
        </Button>
      )}
    </div>
  );
};

export default YouTubeDownloader;
