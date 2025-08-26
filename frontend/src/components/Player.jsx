import React, { useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { usePlayerStore } from '../stores/player';
import { useToast } from '../hooks/use-toast';

const isHls = (url) => /.m3u8($|\?)/i.test(url);

const Player = () => {
  const audioRef = useRef(null);
  const { toast } = useToast();

  // Player state
  const {
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

  // Load track when it changes
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || !currentTrack) return;

    let hls;
    const load = async () => {
      try {
        if (currentTrack.playback?.kind === 'youtube-embed') {
          return;
        }

        audioEl.crossOrigin = 'anonymous';

        if (currentTrack.playback?.kind === 'hls' || isHls(currentTrack.playback?.url)) {
          if (audioEl.canPlayType('application/vnd.apple.mpegurl')) {
            audioEl.src = currentTrack.playback.url;
          } else {
            console.warn('HLS fallback to hls.js');
            const Hls = (await import('hls.js')).default;
            hls = new Hls();
            hls.loadSource(currentTrack.playback.url);
            hls.attachMedia(audioEl);
          }
        } else if (currentTrack.playback?.kind === 'direct') {
          audioEl.src = currentTrack.playback.url;
        } else {
          audioEl.removeAttribute('src');
        }

        await new Promise((resolve, reject) => {
          const onLoaded = () => { cleanup(); resolve(); };
          const onError = (e) => { cleanup(); reject(e); };
          const timeoutId = setTimeout(() => {
            console.warn('track load timeout');
            cleanup();
            reject(new Error('timeout'));
          }, 5000);
          const cleanup = () => {
            audioEl.removeEventListener('loadedmetadata', onLoaded);
            audioEl.removeEventListener('error', onError);
            clearTimeout(timeoutId);
          };
          audioEl.addEventListener('loadedmetadata', onLoaded);
          audioEl.addEventListener('error', onError);
        });

        if (playing) {
          try {
            await audioEl.play();
          } catch (e) {
            console.warn('audio.play() failed', e?.name, e?.message);
            toast({ title: 'Lecture impossible (format ou CORS)' });
          }
        }
      } catch (err) {
        console.warn('track load failed', err);
        toast({ title: 'Lecture impossible (format ou CORS)' });
      }
    };

    load();

    return () => {
      if (hls) hls.destroy();
    };
  }, [currentTrack, playing, toast]);

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
    if (!audio || !currentTrack || currentTrack.playback?.kind === 'youtube-embed') return;
    if (playing) {
      audio.play().catch(e => {
        console.warn('audio.play() failed', e?.name, e?.message);
        setPlaying(false);
        toast({ title: 'Lecture impossible (format ou CORS)' });
      });
    } else {
      audio.pause();
    }
  }, [playing, currentTrack, setPlaying, toast]);

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

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="h-24 bg-gray-900 border-t border-gray-800 px-4 flex items-center justify-between gap-4">
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
        preload="metadata"
      />

      {currentTrack.playback?.kind === 'youtube-embed' && (
        <iframe
          src={`https://www.youtube.com/embed/${currentTrack.playback.videoId}?autoplay=1&rel=0`}
          title={currentTrack.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          frameBorder="0"
          style={{ display: 'none' }}
        />
      )}

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
            {currentTrack.artist || currentTrack.artistName}
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
            disabled={duration === 0}
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
