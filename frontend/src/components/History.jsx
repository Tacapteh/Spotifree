import React, { useEffect, useMemo } from 'react';
import { Clock, Play, TrendingUp, Calendar, Music, BarChart3 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useHistoryStore } from '../stores/history';
import { useLibraryStore } from '../stores/library';
import { usePlayerStore } from '../stores/player';
import { useToast } from '../hooks/use-toast';

const History = () => {
  const { history, loaded, load, getRecentTracks, getMostPlayed, getTodayListeningTime, clearHistory } = useHistoryStore();
  const { getTrack } = useLibraryStore();
  const { playTrack } = usePlayerStore();
  const { toast } = useToast();

  useEffect(() => {
    if (!loaded) {
      load();
    }
  }, [loaded, load]);

  const recentTracks = useMemo(() => {
    return getRecentTracks()
      .map(entry => ({
        ...entry,
        track: getTrack(entry.trackId)
      }))
      .filter(entry => entry.track); // Only include tracks that still exist
  }, [getRecentTracks, getTrack]);

  const mostPlayedTracks = useMemo(() => {
    return getMostPlayed()
      .map(entry => ({
        ...entry,
        track: getTrack(entry.trackId)
      }))
      .filter(entry => entry.track);
  }, [getMostPlayed, getTrack]);

  const todayListeningTime = useMemo(() => {
    const totalMs = getTodayListeningTime();
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, totalMs };
  }, [getTodayListeningTime]);

  const handlePlayTrack = (track) => {
    playTrack(track);
    toast({
      title: "Lecture en cours",
      description: `"${track.title}" par ${track.artistName}`
    });
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      toast({
        title: "Historique effacé",
        description: "Votre historique d'écoute a été supprimé"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'effacer l'historique",
        variant: "destructive"
      });
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const playDate = new Date(date);
    const diffTime = Math.abs(now - playDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Aujourd'hui";
    if (diffDays === 2) return "Hier";
    if (diffDays <= 7) return `Il y a ${diffDays - 1} jour(s)`;
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long'
    }).format(playDate);
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!loaded) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-400">Chargement de l'historique...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Historique d'écoute</h1>
        {history.length > 0 && (
          <Button
            variant="outline"
            onClick={handleClearHistory}
            className="border-gray-600 text-gray-400 hover:text-white hover:border-red-500 hover:text-red-500"
          >
            Effacer l'historique
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16">
          <Clock size={64} className="text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Aucun historique</h2>
          <p className="text-gray-400">Votre historique d'écoute apparaîtra ici après avoir écouté de la musique</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-purple-500 to-pink-500 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Temps d'écoute aujourd'hui</p>
                  <p className="text-white text-2xl font-bold">
                    {todayListeningTime.hours > 0 && `${todayListeningTime.hours}h `}
                    {todayListeningTime.minutes}min
                  </p>
                </div>
                <Clock className="text-white" size={32} />
              </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500 to-teal-500 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Pistes écoutées</p>
                  <p className="text-white text-2xl font-bold">{history.length}</p>
                </div>
                <Music className="text-white" size={32} />
              </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Cette semaine</p>
                  <p className="text-white text-2xl font-bold">{recentTracks.length}</p>
                </div>
                <TrendingUp className="text-white" size={32} />
              </div>
            </Card>
          </div>

          {/* Most Played */}
          {mostPlayedTracks.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="text-green-500" />
                Les plus écoutées
              </h2>
              <div className="space-y-2">
                {mostPlayedTracks.map(({ track, playCount }, index) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800 transition-colors group cursor-pointer"
                    onClick={() => handlePlayTrack(track)}
                  >
                    <div className="w-8 h-8 flex items-center justify-center text-gray-400 font-mono text-sm">
                      #{index + 1}
                    </div>
                    
                    <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center flex-shrink-0 relative">
                      <Music size={16} className="text-gray-400" />
                      <Button
                        className="absolute inset-0 w-full h-full rounded bg-green-500 hover:bg-green-400 text-black opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Play size={16} fill="currentColor" />
                      </Button>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{track.title}</div>
                      <div className="text-gray-400 text-sm truncate">{track.artistName}</div>
                    </div>
                    
                    <div className="text-gray-400 text-sm">
                      {playCount} écoute{playCount > 1 ? 's' : ''}
                    </div>
                    
                    <div className="text-gray-400 text-sm">
                      {formatDuration(track.durationMs)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Listening */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="text-green-500" />
              Récemment écoutées
            </h2>
            <div className="space-y-2">
              {recentTracks.map(({ track, playedAt, progress }) => (
                <div
                  key={`${track.id}-${playedAt}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800 transition-colors group cursor-pointer"
                  onClick={() => handlePlayTrack(track)}
                >
                  <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center flex-shrink-0 relative">
                    <Music size={16} className="text-gray-400" />
                    <Button
                      className="absolute inset-0 w-full h-full rounded bg-green-500 hover:bg-green-400 text-black opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play size={16} fill="currentColor" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{track.title}</div>
                    <div className="text-gray-400 text-sm truncate">{track.artistName}</div>
                  </div>
                  
                  <div className="text-gray-400 text-sm">
                    {formatDate(playedAt)}
                  </div>
                  
                  <div className="text-gray-400 text-sm">
                    {Math.round(progress * 100)}% écouté
                  </div>
                  
                  <div className="text-gray-400 text-sm">
                    {formatDuration(track.durationMs)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;