import React, { useState } from 'react';
import axios from 'axios';
import { Input } from './ui/input';
import { Button } from './ui/button';

const YouTubeDownloader = () => {
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setInfo(null);
    try {
      const res = await axios.post('/api/youtube/info', { url });
      setInfo(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Analyse échouée');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(
        '/api/youtube/download',
        { url },
        { responseType: 'blob' }
      );
      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      const filename = info?.title ? `${info.title}.mp3` : 'audio.mp3';
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError(e.response?.data?.detail || 'Téléchargement échoué');
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
          {loading ? 'Téléchargement...' : 'Télécharger en MP3'}
        </Button>
      )}
    </div>
  );
};

export default YouTubeDownloader;
