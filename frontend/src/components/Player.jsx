import React, { useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { usePlayerStore } from '../stores/player';

const Player = () => {
  const audioRef = useRef(null);
  
  // Player state
  const {
    currentSrc,
    currentTrack,
    playing,
    progress,
    duration,
    volume,
    shuffle,
    repeat,
    queue,
    currentIndex
  } = usePlayerStore();
  
  // Player actions
  const {
    setPlaying,
    setProgress,
    setVolume,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    onEnded,
    onTimeUpdate,
    onLoadedMetadata
  } = usePlayerStore();

  // Handle audio element changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSrc) {
      audio.src = currentSrc;
      audio.load();
      
      if (playing) {
        audio.play().catch(error => {
          console.error('Failed to play audio:', error);
          setPlaying(false);
        });
      }
    }
  }, [currentSrc, playing, setPlaying]);

  // Handle volume changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  // Handle playing state changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSrc) return;

    if (playing) {
      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        setPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [playing, currentSrc, setPlaying]);

  // Audio event handlers
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      onTimeUpdate(audio.currentTime, audio.duration);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) {
      onLoadedMetadata(audio.duration);
    }
  };

  const handleEnded = () => {
    onEnded();
  };

  const handlePlayPause = () => {
    setPlaying(!playing);
  };

  const handleProgressChange = (value) => {
    const audio = audioRef.current;
    if (audio && duration > 0) {
      const newTime = (value[0] / 100) * duration;
      audio.currentTime = newTime;
      setProgress(value[0] / 100);
    }
  };

  const handleVolumeChange = (value) => {
    setVolume(value[0] / 100);
  };

  const formatTime = (seconds) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if no track
  if (!currentTrack) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-4 z-50">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Current Track Info */}
      <div className="flex items-center gap-4 w-80">
        <div className="w-14 h-14 bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0">
          {currentTrack.artworkUrl ? (
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              className="w-full h-full object-cover rounded-md"
            />
          ) : (
            <div className="text-gray-400 text-xs">♪</div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium truncate">
            {currentTrack.title}
          </div>
          <div className="text-gray-400 text-xs truncate">
            {currentTrack.artistName}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="p-1 text-gray-400 hover:text-green-500"
        >
          <Heart size={16} />
        </Button>
      </div>

      {/* Player Controls */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleShuffle}
            className={`p-2 ${shuffle ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
          >
            <Shuffle size={16} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={playPrevious}
            disabled={queue.length <= 1}
            className="p-2 text-gray-400 hover:text-white disabled:text-gray-600"
          >
            <SkipBack size={16} />
          </Button>
          
          <Button
            onClick={handlePlayPause}
            className="w-8 h-8 rounded-full bg-white text-black hover:bg-gray-200 flex items-center justify-center"
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={playNext}
            disabled={queue.length <= 1}
            className="p-2 text-gray-400 hover:text-white disabled:text-gray-600"
          >
            <SkipForward size={16} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleRepeat}
            className={`p-2 ${repeat !== 'none' ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
          >
            <Repeat size={16} />
            {repeat === 'one' && <span className="text-xs ml-1">1</span>}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-gray-400 w-10 text-center">
            {formatTime(progress * duration)}
          </span>
          <Slider
            value={[progress * 100]}
            onValueChange={handleProgressChange}
            max={100}
            step={0.1}
            className="flex-1 cursor-pointer"
          />
          <span className="text-xs text-gray-400 w-10 text-center">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume & Queue Info */}
      <div className="flex items-center gap-2 w-80 justify-end">
        <div className="text-xs text-gray-400 mr-4">
          {queue.length > 0 && `${currentIndex + 1} / ${queue.length}`}
        </div>
        
        <div className="flex items-center gap-2">
          <Volume2 size={16} className="text-gray-400" />
          <Slider
            value={[volume * 100]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="w-24 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default Player;