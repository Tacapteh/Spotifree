import React from 'react';
import { User, Play } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useArtistsFromPlaylists } from '../lib/selectors';
import { Artist } from '../lib/types';

interface HomeArtistsProps {
  onOpenArtist: (artistId: string, artistName: string) => void;
}

const HomeArtists: React.FC<HomeArtistsProps> = ({ onOpenArtist }) => {
  const artists = useArtistsFromPlaylists();

  if (artists.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <User className="text-green-500" />
          Vos artistes
        </h2>
        <div className="text-center py-8 text-gray-400">
          <User size={48} className="mx-auto mb-4 opacity-50" />
          <p>Aucun artiste trouvé</p>
          <p className="text-sm">Importez de la musique pour voir vos artistes préférés</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="text-green-500" />
          Vos artistes
        </h2>
        <Button
          variant="ghost"
          className="text-gray-400 hover:text-white text-sm font-medium"
        >
          Voir tout
        </Button>
      </div>

      {/* Responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {artists.slice(0, 12).map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            onOpenArtist={onOpenArtist}
          />
        ))}
      </div>
    </div>
  );
};

interface ArtistCardProps {
  artist: Artist;
  onOpenArtist: (artistId: string, artistName: string) => void;
}

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onOpenArtist }) => {
  const handleClick = () => {
    onOpenArtist(artist.id, artist.name);
  };

  return (
    <Card className="group relative bg-gray-900 border-gray-800 hover:bg-gray-800 transition-all duration-300 cursor-pointer overflow-hidden">
      <button
        onClick={handleClick}
        className="w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-lg"
        aria-label={`Ouvrir l'artiste ${artist.name} - ${artist.trackCount} piste(s)`}
      >
        {/* Artist Avatar/Icon */}
        <div className="relative mb-4">
          <div className="w-full aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center">
            <User size={32} className="text-gray-400" />
          </div>
          
          {/* Play button overlay */}
          <Button
            className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-green-500 hover:bg-green-400 text-black opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg flex items-center justify-center p-0"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            <Play size={16} fill="currentColor" />
          </Button>
        </div>

        {/* Artist Info */}
        <div className="space-y-1">
          <h3 className="font-medium text-white text-sm line-clamp-1 group-hover:text-green-400 transition-colors">
            {artist.name}
          </h3>
          <p className="text-gray-400 text-xs">
            {artist.trackCount} piste{artist.trackCount > 1 ? 's' : ''}
          </p>
        </div>
      </button>
    </Card>
  );
};

export default HomeArtists;