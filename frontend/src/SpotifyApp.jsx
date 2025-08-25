import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import MusicPlayer from './components/MusicPlayer';
import LocalPlayer from './components/LocalPlayer';
import { Button } from './components/ui/button';
import { mockTrendingSongs } from './data/mockData';

const SpotifyApp = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentView, setCurrentView] = useState('discover'); // 'discover' or 'local'

  const handleTrackSelect = (track) => {
    setCurrentTrack(track);
  };

  if (currentView === 'local') {
    return <LocalPlayer />;
  }

  return (
    <div className="h-screen bg-black flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col">
          <Sidebar />
          <div className="p-4 border-t border-gray-800">
            <Button
              onClick={() => setCurrentView('local')}
              variant="outline"
              className="w-full text-sm bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
            >
              🎵 Local Player
            </Button>
          </div>
        </div>
        <MainContent onTrackSelect={handleTrackSelect} />
      </div>
      <MusicPlayer currentTrack={currentTrack} />
    </div>
  );
};

export default SpotifyApp;