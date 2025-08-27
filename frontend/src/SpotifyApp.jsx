import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import MusicPlayer from './components/MusicPlayer';
import LocalPlayer from './components/LocalPlayer';
import { Button } from './components/ui/button';
import { Home, Music } from 'lucide-react';
import { Toaster } from './components/ui/toaster';
import { mockTrendingSongs } from './data/mockData';

const SpotifyApp = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentView, setCurrentView] = useState('discover'); // 'discover' or 'local'

  const handleTrackSelect = (track) => {
    setCurrentTrack(track);
  };

  // Local Player View
  if (currentView === 'local') {
    return (
      <div className="h-screen bg-black flex flex-col">
        {/* Header Navigation */}
        <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setCurrentView('discover')}
              variant="ghost" 
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Home size={20} />
              Retour à l'accueil
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Music className="text-green-500 w-6 h-6" />
            <span className="text-white font-semibold">Lecteur Local</span>
          </div>
        </div>
        <div className="flex-1">
          <LocalPlayer />
        </div>
        <Toaster />
      </div>
    );
  }

  // Main Discover View
  return (
    <div className="h-screen bg-black flex flex-col">
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <div className="flex flex-col">
          <Sidebar />
          <div className="p-4 border-t border-gray-800 space-y-2">
            <Button
              onClick={() => setCurrentView('local')}
              variant="outline"
              className="w-full text-sm bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:border-green-500 transition-colors flex items-center gap-2"
            >
              <Music size={16} />
              Lecteur Local
            </Button>
          </div>
        </div>
        <MainContent onTrackSelect={handleTrackSelect} />
      </div>
      <MusicPlayer currentTrack={currentTrack} />
      <Toaster />
    </div>
  );
};

export default SpotifyApp;