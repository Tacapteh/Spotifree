import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import MusicPlayer from './components/MusicPlayer';
import { mockTrendingSongs } from './data/mockData';

const SpotifyApp = () => {
  const [currentTrack, setCurrentTrack] = useState(null);

  const handleTrackSelect = (track) => {
    setCurrentTrack(track);
  };

  return (
    <div className="h-screen bg-black flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainContent onTrackSelect={handleTrackSelect} />
      </div>
      <MusicPlayer currentTrack={currentTrack} />
    </div>
  );
};

export default SpotifyApp;