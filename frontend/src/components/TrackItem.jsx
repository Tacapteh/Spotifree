import React, { useState, useEffect } from 'react';
import { Play, Pause, MoreHorizontal, Trash2, Music, User } from 'lucide-react';
import { Button } from './ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { usePlayerStore } from '../stores/player';
import { useLibraryStore } from '../stores/library';
import { useToast } from '../hooks/use-toast';
import { getArtistImage } from '../services/musicBrainz';

const TrackItem = ({ track, showArtist = true, onRemove, className = "" }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [artistImage, setArtistImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  
  const { currentTrack, playing, playTrack } = usePlayerStore();
  const { removeTrack } = useLibraryStore();
  const { toast } = useToast();

  const isCurrentTrack = currentTrack?.id === track.id;
  const isPlaying = isCurrentTrack && playing;

  // Load artist image
  useEffect(() => {
    const loadArtistImage = async () => {
      if (track.artistName && track.artistName !== 'Unknown Artist') {
        try {
          const image = await getArtistImage(track.artistName);
          setArtistImage(image);
        } catch (error) {
          console.warn('Failed to load artist image:', error);
        }
      }
      setImageLoading(false);
    };

    loadArtistImage();
  }, [track.artistName]);

  const handlePlay = () => {
    playTrack(track);
  };

  const handleDelete = async () => {
    try {
      await removeTrack(track.id);
      toast({
        title: "Piste supprimée",
        description: `"${track.title}" a été supprimée de votre bibliothèque`
      });
      onRemove?.(track.id);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer cette piste",
        variant: "destructive"
      });
    }
    setIsDeleteDialogOpen(false);
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className={`group flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer ${className}`}>
        {/* Album Art / Artist Image */}
        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center flex-shrink-0 relative overflow-hidden">
          {!imageLoading && artistImage ? (
            <img
              src={artistImage}
              alt={track.artistName}
              className="w-full h-full object-cover"
              onError={() => setArtistImage(null)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {track.artworkUrl ? (
                <img
                  src={track.artworkUrl}
                  alt={track.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <Music size={16} className="text-gray-400" style={{ display: track.artworkUrl ? 'none' : 'flex' }} />
            </div>
          )}
          
          {/* Play/Pause Overlay */}
          <Button
            onClick={handlePlay}
            className="absolute inset-0 w-full h-full rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            {isPlaying ? (
              <Pause size={16} className="text-white" />
            ) : (
              <Play size={16} className="text-white" fill="currentColor" />
            )}
          </Button>
        </div>
        
        {/* Track Info */}
        <div className="flex-1 min-w-0" onClick={handlePlay}>
          <div className={`font-medium truncate ${isCurrentTrack ? 'text-green-500' : 'text-white'}`}>
            {track.title}
          </div>
          {showArtist && (
            <div className="text-gray-400 text-sm truncate flex items-center gap-1">
              {!imageLoading && artistImage && (
                <User size={12} className="text-green-500" />
              )}
              {track.artistName}
            </div>
          )}
        </div>
        
        {/* Duration */}
        <div className="text-gray-400 text-sm hidden sm:block">
          {formatDuration(track.durationMs)}
        </div>
        
        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-400 hover:bg-red-900/20 focus:bg-red-900/20"
              >
                <Trash2 size={14} className="mr-2" />
                Supprimer de la bibliothèque
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Supprimer cette piste ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Êtes-vous sûr de vouloir supprimer "{track.title}" de votre bibliothèque ? 
              Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TrackItem;