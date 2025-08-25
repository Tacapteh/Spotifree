import React, { useState } from 'react';
import { Plus, Play, MoreHorizontal, Music, Heart, Clock, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useLibraryStore } from '../stores/library';
import { usePlayerStore } from '../stores/player';
import { useToast } from '../hooks/use-toast';

const Playlists = () => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { playlists, tracks, createPlaylist, getPlaylistTracks } = useLibraryStore();
  const { playQueue } = usePlayerStore();
  const { toast } = useToast();

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez entrer un nom pour la playlist",
        variant: "destructive"
      });
      return;
    }

    try {
      await createPlaylist(newPlaylistName.trim());
      toast({
        title: "Playlist créée",
        description: `"${newPlaylistName}" a été créée avec succès`
      });
      setNewPlaylistName('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la playlist",
        variant: "destructive"
      });
    }
  };

  const handlePlayPlaylist = (playlist) => {
    const playlistTracks = getPlaylistTracks(playlist.id);
    if (playlistTracks.length > 0) {
      playQueue(playlistTracks);
      toast({
        title: "Lecture en cours",
        description: `Playlist "${playlist.name}"`
      });
    } else {
      toast({
        title: "Playlist vide",
        description: "Cette playlist ne contient aucune piste",
        variant: "destructive"
      });
    }
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(date));
  };

  const getTotalDuration = (playlistId) => {
    const playlistTracks = getPlaylistTracks(playlistId);
    const totalMs = playlistTracks.reduce((sum, track) => sum + (track.durationMs || 0), 0);
    const totalMinutes = Math.floor(totalMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Vos playlists</h1>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-500 hover:bg-green-400 text-black font-medium">
              <Plus size={20} className="mr-2" />
              Créer une playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Créer une nouvelle playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nom de la playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-gray-600 text-gray-400 hover:text-white"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreatePlaylist}
                  className="bg-green-500 hover:bg-green-400 text-black"
                  disabled={!newPlaylistName.trim()}
                >
                  Créer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Playlists Grid */}
      {playlists.length === 0 ? (
        <div className="text-center py-16">
          <Music size={64} className="text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Aucune playlist</h2>
          <p className="text-gray-400 mb-6">Créez votre première playlist pour organiser votre musique</p>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-green-500 hover:bg-green-400 text-black font-medium"
          >
            <Plus size={20} className="mr-2" />
            Créer une playlist
          </Button>
        </div>
      ) : (
        <>
          {/* Special Playlists */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Créées par vous</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Liked Songs (Special Playlist) */}
              <Card className="group bg-gray-900 border-gray-800 hover:bg-gray-800 transition-all duration-300 cursor-pointer">
                <div className="p-6">
                  <div className="relative mb-4">
                    <div className="w-full aspect-square bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <Heart size={48} className="text-white" fill="currentColor" />
                    </div>
                    <Button
                      className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-green-500 hover:bg-green-400 text-black opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg"
                      disabled={tracks.length === 0}
                    >
                      <Play size={20} fill="currentColor" />
                    </Button>
                  </div>
                  <h3 className="font-bold text-white text-base mb-2">Titres likés</h3>
                  <p className="text-gray-400 text-sm">{tracks.length} pistes likées</p>
                </div>
              </Card>

              {/* User Created Playlists */}
              {playlists.map((playlist) => (
                <Card
                  key={playlist.id}
                  className="group bg-gray-900 border-gray-800 hover:bg-gray-800 transition-all duration-300 cursor-pointer"
                >
                  <div className="p-6">
                    <div className="relative mb-4">
                      <div className="w-full aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                        <Music size={48} className="text-gray-400" />
                      </div>
                      <Button
                        className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-green-500 hover:bg-green-400 text-black opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPlaylist(playlist);
                        }}
                        disabled={playlist.trackIds.length === 0}
                      >
                        <Play size={20} fill="currentColor" />
                      </Button>
                    </div>
                    
                    <h3 className="font-bold text-white text-base mb-2 line-clamp-1">
                      {playlist.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-1">
                      {playlist.trackIds.length} piste{playlist.trackIds.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-gray-500 text-xs flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(playlist.createdAt)}
                    </p>
                  </div>

                  <div className="px-6 pb-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <Clock size={12} />
                      <span>{getTotalDuration(playlist.id)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Recently Created */}
          {playlists.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Récemment créées</h2>
              <div className="space-y-2">
                {playlists
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .slice(0, 5)
                  .map((playlist) => (
                    <div
                      key={`recent-${playlist.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800 transition-colors group cursor-pointer"
                      onClick={() => handlePlayPlaylist(playlist)}
                    >
                      <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center flex-shrink-0 relative">
                        <Music size={16} className="text-gray-400" />
                        <Button
                          className="absolute inset-0 w-full h-full rounded bg-green-500 hover:bg-green-400 text-black opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={playlist.trackIds.length === 0}
                        >
                          <Play size={16} fill="currentColor" />
                        </Button>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{playlist.name}</div>
                        <div className="text-gray-400 text-sm">
                          {playlist.trackIds.length} piste{playlist.trackIds.length !== 1 ? 's' : ''} • {formatDate(playlist.createdAt)}
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal size={16} />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Playlists;