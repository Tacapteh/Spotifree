import React, { useState, useMemo } from 'react';
import { Search as SearchIcon, Play, Plus, Music, User } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useLibraryStore } from '../stores/library';
import { usePlayerStore } from '../stores/player';
import { useToast } from '../hooks/use-toast';

const Search = () => {
  const [query, setQuery] = useState('');
  const { tracks, playlists } = useLibraryStore();
  const { playTrack, playQueue } = usePlayerStore();
  const { toast } = useToast();

  // Filter tracks based on search query
  const filteredTracks = useMemo(() => {
    if (!query.trim()) return [];
    const lowercaseQuery = query.toLowerCase();
    return tracks.filter(track => 
      track.title.toLowerCase().includes(lowercaseQuery) ||
      track.artistName.toLowerCase().includes(lowercaseQuery)
    );
  }, [tracks, query]);

  // Filter playlists based on search query
  const filteredPlaylists = useMemo(() => {
    if (!query.trim()) return [];
    const lowercaseQuery = query.toLowerCase();
    return playlists.filter(playlist => 
      playlist.name.toLowerCase().includes(lowercaseQuery)
    );
  }, [playlists, query]);

  // Get unique artists from filtered tracks
  const filteredArtists = useMemo(() => {
    if (!query.trim()) return [];
    const artistMap = new Map();
    const lowercaseQuery = query.toLowerCase();
    
    tracks.forEach(track => {
      if (track.artistName.toLowerCase().includes(lowercaseQuery)) {
        if (!artistMap.has(track.artistId)) {
          artistMap.set(track.artistId, {
            id: track.artistId,
            name: track.artistName,
            trackCount: 1
          });
        } else {
          artistMap.get(track.artistId).trackCount++;
        }
      }
    });

    return Array.from(artistMap.values());
  }, [tracks, query]);

  const handlePlayTrack = (track) => {
    playTrack(track);
    toast({
      title: "Lecture en cours",
      description: `"${track.title}" par ${track.artistName}`
    });
  };

  const handlePlayArtist = (artistId, artistName) => {
    const artistTracks = tracks.filter(track => track.artistId === artistId);
    if (artistTracks.length > 0) {
      playQueue(artistTracks);
      toast({
        title: "Lecture en cours",
        description: `Toutes les pistes de ${artistName}`
      });
    }
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-6">Rechercher</h1>
        
        {/* Search Input */}
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Que souhaitez-vous écouter ?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 h-12"
          />
        </div>
      </div>

      {/* Search Results */}
      {query.trim() ? (
        <div className="space-y-8">
          {/* Tracks */}
          {filteredTracks.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Music className="text-green-500" />
                Pistes
              </h2>
              <div className="space-y-2">
                {filteredTracks.slice(0, 10).map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 p-2 rounded-lg hover:bg-gray-800 transition-colors group cursor-pointer"
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
                      {formatDuration(track.durationMs)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artists */}
          {filteredArtists.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <User className="text-green-500" />
                Artistes
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredArtists.slice(0, 12).map((artist) => (
                  <Card
                    key={artist.id}
                    className="group relative bg-gray-900 border-gray-800 hover:bg-gray-800 transition-all duration-300 cursor-pointer"
                    onClick={() => handlePlayArtist(artist.id, artist.name)}
                  >
                    <div className="p-4">
                      <div className="relative mb-4">
                        <div className="w-full aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center">
                          <User size={32} className="text-gray-400" />
                        </div>
                        <Button
                          className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-green-500 hover:bg-green-400 text-black opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg flex items-center justify-center p-0"
                        >
                          <Play size={16} fill="currentColor" />
                        </Button>
                      </div>
                      <h3 className="font-medium text-white text-sm truncate">{artist.name}</h3>
                      <p className="text-gray-400 text-xs">
                        {artist.trackCount} piste{artist.trackCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {filteredTracks.length === 0 && filteredArtists.length === 0 && filteredPlaylists.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <SearchIcon size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-xl mb-2">Aucun résultat trouvé pour "{query}"</p>
              <p className="text-sm">Essayez d'utiliser d'autres mots-clés ou importez plus de musique</p>
            </div>
          )}
        </div>
      ) : (
        /* Browse Categories */
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Parcourir tout</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { name: 'Ma bibliothèque', color: 'from-purple-500 to-pink-500', tracks: tracks.length },
              { name: 'Récemment ajoutés', color: 'from-blue-500 to-cyan-500', tracks: Math.min(tracks.length, 20) },
              { name: 'Favoris', color: 'from-red-500 to-orange-500', tracks: 0 },
              { name: 'Découverte', color: 'from-green-500 to-teal-500', tracks: tracks.length }
            ].map((category, index) => (
              <Card
                key={index}
                className={`relative overflow-hidden cursor-pointer hover:scale-105 transition-transform bg-gradient-to-br ${category.color}`}
              >
                <div className="p-6">
                  <h3 className="text-white font-bold text-lg mb-2">{category.name}</h3>
                  <p className="text-white/80 text-sm">{category.tracks} pistes</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;