import React, { useState, useEffect } from 'react';
import { Download, Play, Pause, Trash2, ExternalLink, Clock, HardDrive, AlertTriangle, CheckCircle, Music } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { useToast } from '../hooks/use-toast';
import { useLibraryStore } from '../stores/library';
import { usePlayerStore } from '../stores/player';
import { nanoid } from 'nanoid';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const YouTubeDownloader = () => {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [downloadedTracks, setDownloadedTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  
  const { toast } = useToast();
  const { addTracks } = useLibraryStore();
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    fetchDownloadedTracks();
  }, []);

  const fetchDownloadedTracks = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/youtube/downloads`);
      if (response.data.success) {
        setDownloadedTracks(response.data.tracks);
      }
    } catch (error) {
      console.error('Error fetching downloaded tracks:', error);
    }
  };

  const handleGetVideoInfo = async () => {
    if (!url.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une URL YouTube valide",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setVideoInfo(null); // Reset previous info
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/youtube/info`, { url });
      if (response.data.success) {
        setVideoInfo(response.data.data);
        toast({
          title: "Succès",
          description: "Informations de la vidéo récupérées avec succès"
        });
      }
    } catch (error) {
      console.error('YouTube info error:', error);
      let errorMessage = "Impossible de récupérer les informations de la vidéo";
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.status === 403) {
        errorMessage = "Accès interdit par YouTube. Essayez une autre vidéo.";
      } else if (error.response?.status === 404) {
        errorMessage = "Vidéo non trouvée ou supprimée.";
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = "Erreur de connexion. Vérifiez votre internet.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
      setVideoInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo) return;

    setIsDownloading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/youtube/download`, {
        url,
        format: 'mp3'
      });

      if (response.data.success) {
        toast({
          title: "Téléchargement terminé",
          description: `"${response.data.track.title}" a été téléchargé avec succès`
        });
        
        // Add to library as well
        const track = {
          id: nanoid(),
          source: 'youtube',
          sourceId: response.data.track.id,
          title: response.data.track.title,
          artistName: response.data.track.artist,
          artistId: response.data.track.artist.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          durationMs: response.data.track.duration * 1000,
          playable: 'direct',
          youtubeUrl: url
        };
        
        await addTracks([track]);
        
        fetchDownloadedTracks();
        setUrl('');
        setVideoInfo(null);
      }
    } catch (error) {
      toast({
        title: "Erreur de téléchargement",
        description: error.response?.data?.detail || "Échec du téléchargement",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePlayTrack = async (track) => {
    try {
      if (currentlyPlaying === track.id) {
        setCurrentlyPlaying(null);
      } else {
        setCurrentlyPlaying(track.id);
        
        // Create a track object for the player
        const playerTrack = {
          id: track.id,
          source: 'youtube',
          sourceId: `${BACKEND_URL}/api/youtube/download/${track.id}/stream`,
          title: track.title,
          artistName: track.artist,
          artistId: track.artist.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          durationMs: track.duration * 1000,
          playable: 'direct'
        };
        
        playTrack(playerTrack);
        
        toast({
          title: "Lecture en cours",
          description: `Lecture de "${track.title}"`
        });
      }
    } catch (error) {
      toast({
        title: "Erreur de lecture",
        description: "Impossible de lire cette piste",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTrack = async (trackId) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/youtube/download/${trackId}`);
      toast({
        title: "Supprimé",
        description: "Piste supprimée avec succès"
      });
      fetchDownloadedTracks();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer cette piste",
        variant: "destructive"
      });
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const isValidYouTubeUrl = (url) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/;
    return pattern.test(url);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-4 flex items-center gap-2">
          <Download className="text-red-500" />
          YouTube Downloader
        </h1>
        
        {/* Disclaimer */}
        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-yellow-500 mt-0.5 flex-shrink-0" size={16} />
            <div className="text-sm">
              <p className="font-medium text-yellow-500 mb-1">⚠️ Avertissement Important</p>
              <p className="text-yellow-200">
                Respectez les droits d'auteur et les conditions d'utilisation de YouTube. 
                Utilisez uniquement pour du contenu libre de droits ou vos propres créations.
              </p>
            </div>
          </div>
        </div>

        {/* URL Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Entrez l'URL YouTube (ex: https://www.youtube.com/watch?v=...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white flex-1"
            disabled={isLoading || isDownloading}
          />
          <Button
            onClick={handleGetVideoInfo}
            disabled={!isValidYouTubeUrl(url) || isLoading || isDownloading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'Analyse...' : 'Analyser'}
          </Button>
        </div>
      </div>

      {/* Video Info Preview */}
      {videoInfo && (
        <Card className="mb-8 p-6 bg-gray-900 border-gray-700">
          <div className="flex gap-6">
            {videoInfo.thumbnail && (
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                className="w-40 h-28 object-cover rounded-lg flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-white mb-3 line-clamp-2">
                {videoInfo.title}
              </h3>
              <p className="text-gray-400 text-sm mb-3">Par: {videoInfo.uploader}</p>
              <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatDuration(videoInfo.duration)}
                </span>
                <span>{videoInfo.view_count?.toLocaleString()} vues</span>
              </div>
              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isDownloading ? 'Téléchargement...' : 'Télécharger en MP3'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Downloaded Tracks */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <HardDrive className="text-green-500" />
          Téléchargements YouTube ({downloadedTracks.length})
        </h2>

        {downloadedTracks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Download size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Aucun téléchargement YouTube</p>
            <p className="text-sm">Entrez une URL YouTube ci-dessus pour commencer</p>
          </div>
        ) : (
          <div className="space-y-3">
            {downloadedTracks.map((track) => (
              <Card key={track.id} className="p-4 bg-gray-900 border-gray-700 hover:bg-gray-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlayTrack(track)}
                      className="p-2 text-white hover:text-green-500"
                    >
                      {currentlyPlaying === track.id ? <Pause size={20} /> : <Play size={20} />}
                    </Button>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{track.title}</h3>
                      <p className="text-sm text-gray-400 truncate">Par: {track.artist}</p>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {formatDuration(track.duration)}
                      </span>
                      <span>{formatFileSize(track.file_size)}</span>
                      <div className="flex items-center gap-1">
                        {track.file_exists ? (
                          <CheckCircle size={14} className="text-green-500" />
                        ) : (
                          <AlertTriangle size={14} className="text-yellow-500" />
                        )}
                        <span>{track.file_exists ? 'Disponible' : 'Fichier manquant'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(track.youtube_url, '_blank')}
                      className="p-2 text-gray-400 hover:text-white"
                      title="Ouvrir sur YouTube"
                    >
                      <ExternalLink size={16} />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTrack(track.id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeDownloader;