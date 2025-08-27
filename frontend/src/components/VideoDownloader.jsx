import React, { useState } from "react";
import axios from "axios";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const VideoDownloader = () => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        "/api/video/download",
        { url },
        { responseType: "blob" },
      );
      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      const disposition = res.headers["content-disposition"];
      let filename = "audio.mp3";
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match) filename = match[1];
      }
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
        errorMessage = "La plateforme a bloqué cette requête. Essayez plus tard.";
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
