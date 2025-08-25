import React, { useRef } from 'react';
import { Upload, Music } from 'lucide-react';
import { Button } from './ui/button';
import { useLibraryStore } from '../stores/library';
import { Track } from '../lib/types';
import { nanoid } from 'nanoid';
import { useToast } from '../hooks/use-toast';

const LocalImport: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addTracks = useLibraryStore(state => state.addTracks);
  const { toast } = useToast();

  /**
   * Parse filename to extract artist and title
   * Expected formats: "Artist - Title.ext" or "Title.ext"
   */
  const parseFilename = (filename: string): { artist: string; title: string } => {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    
    // Try to split by " - " (dash with spaces)
    const parts = nameWithoutExt.split(' - ');
    
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(' - ').trim() // In case title contains " - "
      };
    } else {
      return {
        artist: 'Unknown Artist',
        title: nameWithoutExt.trim()
      };
    }
  };

  /**
   * Generate artist ID from artist name (normalize for consistency)
   */
  const generateArtistId = (artistName: string): string => {
    return artistName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  /**
   * Get audio duration using HTML5 Audio API
   */
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        const durationMs = Math.floor(audio.duration * 1000);
        URL.revokeObjectURL(objectUrl);
        resolve(durationMs);
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        resolve(0); // Default to 0 if we can't get duration
      });
      
      audio.src = objectUrl;
    });
  };

  /**
   * Process selected audio files
   */
  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length === 0) {
      toast({
        title: "Aucun fichier audio",
        description: "Veuillez sélectionner des fichiers audio valides",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Importation en cours",
      description: `Traitement de ${audioFiles.length} fichier(s)...`
    });

    try {
      const tracks: Track[] = [];

      for (const file of audioFiles) {
        const { artist, title } = parseFilename(file.name);
        const artistId = generateArtistId(artist);
        const objectUrl = URL.createObjectURL(file);
        const duration = await getAudioDuration(file);

        const track: Track = {
          id: nanoid(),
          source: 'local',
          sourceId: file.name,
          title,
          artistName: artist,
          artistId,
          durationMs: duration,
          playable: 'local',
          objectUrl
        };

        tracks.push(track);
      }

      await addTracks(tracks);

      toast({
        title: "Importation réussie",
        description: `${tracks.length} piste(s) ajoutée(s) à votre bibliothèque`
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Error importing files:', error);
      toast({
        title: "Erreur d'importation",
        description: "Une erreur est survenue lors de l'importation",
        variant: "destructive"
      });
    }
  };

  /**
   * Trigger file selection dialog
   */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Music className="text-green-500" />
          Importer de la musique
        </h2>
        
        <Button
          onClick={handleImportClick}
          className="bg-green-500 hover:bg-green-400 text-black font-medium flex items-center gap-2"
        >
          <Upload size={20} />
          Choisir des fichiers
        </Button>
      </div>

      <div className="text-gray-400 text-sm mb-4">
        <p>Importez vos fichiers audio locaux (MP3, WAV, M4A, etc.)</p>
        <p>Format recommandé du nom de fichier : "Artiste - Titre.ext"</p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*"
        onChange={handleFileSelection}
        style={{ display: 'none' }}
        aria-label="Importer des fichiers audio"
      />

      {/* Drop zone (visual feedback) */}
      <div
        onClick={handleImportClick}
        className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 hover:bg-gray-900/50 transition-all"
      >
        <Upload size={48} className="text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400 mb-2">
          Cliquez ici ou glissez vos fichiers audio
        </p>
        <p className="text-gray-500 text-sm">
          Formats supportés : MP3, WAV, M4A, FLAC, OGG
        </p>
      </div>
    </div>
  );
};

export default LocalImport;