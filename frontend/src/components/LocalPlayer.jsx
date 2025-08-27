import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Upload, Music } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

export default function LocalPlayer() {
  const audioRef = useRef(null);
  const [tracks, setTracks] = useState([]); // [{name,url}]
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState([0]); // 0..100 for Slider component
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);
  const [vol, setVol] = useState([70]); // 0..100 for Slider component

  // Cleanup blob URLs on change/unmount
  useEffect(() => {
    return () => tracks.forEach(t => URL.revokeObjectURL(t.url));
  }, [tracks]);

  const onPick = (e) => {
    const next = Array.from(e.target.files || [])
      .filter(f => f.type.startsWith("audio/") || f.name.toLowerCase().endsWith(".mp3"))
      .map(f => ({ name: f.name.replace(/\.[^/.]+$/, ""), url: URL.createObjectURL(f) }));
    setTracks(next);
    setI(0);
    setPlaying(false);
    setProgress([0]);
  };

  const loadAt = (idx, auto=false) => {
    if (!tracks.length) return;
    const n = Math.max(0, Math.min(idx, tracks.length - 1));
    setI(n);
    setPlaying(auto);
  };

  // (Re)load current source
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !tracks.length) return;
    a.src = tracks[i].url;
    a.load();
    if (playing) a.play().catch(() => setPlaying(false));
    // eslint-disable-next-line
  }, [i, tracks]);

  // Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = vol[0] / 100;
  }, [vol]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { 
      a.pause(); 
      setPlaying(false); 
    } else { 
      a.play().then(()=>setPlaying(true)).catch(()=>{}); 
    }
  };

  const onTime = () => {
    const a = audioRef.current; 
    if (!a) return;
    const d = a.duration || 0, c = a.currentTime || 0;
    setDur(d); 
    setCur(c);
    setProgress([d ? (c/d) * 100 : 0]);
  };

  const onSeek = (value) => {
    const a = audioRef.current; 
    if (!a || !dur) return;
    const p = value[0] / 100;
    a.currentTime = p * dur;
    setProgress(value);
  };

  const next = () => loadAt(i + 1, true);
  const prev = () => loadAt(i - 1, true);

  const formatTime = (seconds) => {
    if(!isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-full bg-black flex flex-col text-white">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-64 bg-black border-r border-gray-800 flex flex-col p-6">
          <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-700 hover:border-green-500 cursor-pointer transition-colors mb-6">
            <Upload size={20} />
            <span className="font-medium">Import MP3 Files</span>
            <input 
              type="file" 
              accept=".mp3,audio/mpeg" 
              multiple 
              className="hidden" 
              onChange={onPick}
            />
          </label>
          
          <div className="text-center text-gray-400 text-sm">
            {tracks.length > 0 ? `${tracks.length} files imported` : 'No files imported yet'}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-gradient-to-b from-gray-800 to-black overflow-y-auto">
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Local Playlist</h1>
            
            {tracks.length === 0 ? (
              <div className="text-center py-16">
                <Music size={64} className="text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No music files loaded</h2>
                <p className="text-gray-400 mb-6">Import some MP3 files to get started</p>
                <label className="inline-flex items-center gap-3 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-full cursor-pointer transition-colors">
                  <Upload size={20} />
                  Choose MP3 Files
                  <input 
                    type="file" 
                    accept=".mp3,audio/mpeg" 
                    multiple 
                    className="hidden" 
                    onChange={onPick}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                {tracks.map((track, idx) => (
                  <div
                    key={track.url}
                    onClick={() => loadAt(idx, true)}
                    className={`group flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all hover:bg-gray-800 ${
                      idx === i ? 'bg-gray-800 border-l-4 border-green-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded flex items-center justify-center ${
                        idx === i ? 'bg-green-500 text-black' : 'bg-gray-700 text-white'
                      }`}>
                        {idx === i && playing ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate text-base">
                          {track.name}
                        </div>
                        <div className="text-gray-400 text-sm">
                          Local MP3 File
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">
                      {idx === i && playing ? (
                        <span className="text-green-500 font-medium">Playing</span>
                      ) : (
                        <span>Ready</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={onTime}
        onLoadedMetadata={onTime}
        onEnded={next}
      />

      {/* Bottom Player */}
      <div className="h-24 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-4">
        {/* Current Track Info */}
        <div className="flex items-center gap-4 w-80">
          {tracks[i] ? (
            <>
              <div className="w-14 h-14 bg-gray-700 rounded-md flex items-center justify-center">
                <Music className="text-gray-400 w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {tracks[i]?.name || "No track"}
                </div>
                <div className="text-gray-400 text-xs truncate">
                  Local MP3 File
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-sm">No track selected</div>
          )}
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={!tracks.length || i === 0}
              className="p-2 text-gray-400 hover:text-white disabled:text-gray-600"
            >
              <SkipBack size={16} />
            </Button>
            
            <Button
              onClick={toggle}
              disabled={!tracks.length}
              className="w-8 h-8 rounded-full bg-white text-black hover:bg-gray-200 flex items-center justify-center disabled:bg-gray-600 disabled:text-gray-400"
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={next}
              disabled={!tracks.length || i >= tracks.length - 1}
              className="p-2 text-gray-400 hover:text-white disabled:text-gray-600"
            >
              <SkipForward size={16} />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-gray-400 w-10 text-center">
              {formatTime(cur)}
            </span>
            <Slider
              value={progress}
              onValueChange={onSeek}
              max={100}
              step={0.1}
              className="flex-1 cursor-pointer"
              disabled={!tracks.length}
            />
            <span className="text-xs text-gray-400 w-10 text-center">
              {formatTime(dur)}
            </span>
          </div>
        </div>

        {/* Volume & Additional Controls */}
        <div className="flex items-center gap-2 w-80 justify-end">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-gray-400" />
            <Slider
              value={vol}
              onValueChange={setVol}
              max={100}
              step={1}
              className="w-24 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}