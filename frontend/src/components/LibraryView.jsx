import React, { useState, useMemo } from 'react';
import { Music, Search as SearchIcon, Filter, Grid, List } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { useLibraryStore } from '../stores/library';
import TrackItem from './TrackItem';

const LibraryView = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('title'); // 'title', 'artist', 'dateAdded'
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid'
  
  const { tracks } = useLibraryStore();

  // Filter and sort tracks
  const filteredTracks = useMemo(() => {
    let filtered = tracks;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = tracks.filter(track =>
        track.title.toLowerCase().includes(query) ||
        track.artistName.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'artist':
          return a.artistName.localeCompare(b.artistName);
        case 'dateAdded':
          // Assuming tracks added later have higher IDs (nanoid)
          return b.id.localeCompare(a.id);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tracks, searchQuery, sortBy]);

  const handleTrackRemove = (trackId) => {
    // Track is already removed by TrackItem component
    // This is just for any additional cleanup if needed
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
          <Music className="text-green-500" />
          Ma bibliothèque
        </h1>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Rechercher dans la bibliothèque..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 text-white"
            />
          </div>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gray-600 text-gray-400 hover:text-white">
                <Filter size={16} className="mr-2" />
                Trier par
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-700">
              <DropdownMenuItem
                onClick={() => setSortBy('title')}
                className={sortBy === 'title' ? 'bg-gray-700' : ''}
              >
                Titre
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy('artist')}
                className={sortBy === 'artist' ? 'bg-gray-700' : ''}
              >
                Artiste
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy('dateAdded')}
                className={sortBy === 'dateAdded' ? 'bg-gray-700' : ''}
              >
                Date d'ajout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode */}
          <div className="flex border border-gray-600 rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none border-r border-gray-600"
            >
              <List size={16} />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid size={16} />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="text-gray-400 text-sm">
          {filteredTracks.length} piste{filteredTracks.length !== 1 ? 's' : ''} 
          {searchQuery && ` trouvée${filteredTracks.length !== 1 ? 's' : ''} pour "${searchQuery}"`}
        </div>
      </div>

      {/* Content */}
      {filteredTracks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {searchQuery ? (
            <>
              <SearchIcon size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-xl mb-2">Aucun résultat pour "{searchQuery}"</p>
              <p className="text-sm">Essayez d'autres mots-clés ou vérifiez l'orthographe</p>
            </>
          ) : (
            <>
              <Music size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-xl mb-2">Votre bibliothèque est vide</p>
              <p className="text-sm">Importez de la musique pour commencer</p>
            </>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-1'}>
          {filteredTracks.map((track) => (
            <TrackItem
              key={track.id}
              track={track}
              onRemove={handleTrackRemove}
              className={viewMode === 'grid' ? 'flex-col items-start text-center p-4' : ''}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LibraryView;