import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Heart, PictureInPicture2 } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

const MusicPlayer = ({ currentTrack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState([30]);
  const [volume, setVolume] = useState([70]);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0: off, 1: all, 2: one

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-900 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between px-4 py-2 md:h-24 gap-2">
      {/* Current Track Info */}
      <div className="flex items-center gap-4 w-full md:w-80 mb-2 md:mb-0">
        {currentTrack && (
          <>
            <img 
              src={currentTrack.image} 
              alt={currentTrack.title}
              className="w-14 h-14 rounded-md"
            />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">
                {currentTrack.title}
              </div>
              <div className="text-gray-400 text-xs truncate">
                {currentTrack.artist}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLiked(!isLiked)}
              className={`p-1 ${isLiked ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
            >
              <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
            </Button>
          </>
        )}
      </div>

      {/* Player Controls */}
      <div className="flex flex-col items-center gap-2 w-full flex-1 md:max-w-2xl">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsShuffled(!isShuffled)}
            className={`p-2 ${isShuffled ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
          >
            <Shuffle size={16} />
          </Button>
          
          <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white">
            <SkipBack size={16} />
          </Button>
          
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-full bg-white text-black hover:bg-gray-200 flex items-center justify-center"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          
          <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white">
            <SkipForward size={16} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRepeatMode((prev) => (prev + 1) % 3)}
            className={`p-2 ${repeatMode > 0 ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
          >
            <Repeat size={16} />
            {repeatMode === 2 && <span className="text-xs">1</span>}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-gray-400 w-10 text-center">
            {formatTime(Math.floor((progress[0] / 100) * 213))}
          </span>
          <Slider
            value={progress}
            onValueChange={setProgress}
            max={100}
            step={1}
            className="flex-1 cursor-pointer"
          />
          <span className="text-xs text-gray-400 w-10 text-center">3:33</span>
        </div>
      </div>

      {/* Volume & Additional Controls */}
      <div className="flex items-center gap-2 w-full md:w-80 justify-end mt-2 md:mt-0">
        <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white">
          <PictureInPicture2 size={16} />
        </Button>
        
        <div className="flex items-center gap-2">
          <Volume2 size={16} className="text-gray-400" />
          <Slider
            value={volume}
            onValueChange={setVolume}
            max={100}
            step={1}
            className="w-24 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;