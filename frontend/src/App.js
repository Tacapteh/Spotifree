import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { useLibraryStore } from "./stores/library";
import { useHistoryStore } from "./stores/history";
import { usePlayerStore } from "./stores/player";

// Components
import Navigation from "./components/Navigation";
import LocalImport from "./components/LocalImport";
import HomeArtists from "./components/HomeArtists";
import Search from "./components/Search";
import Playlists from "./components/Playlists";
import History from "./components/History";
import LibraryView from "./components/LibraryView";
import Player from "./components/Player";
import VideoDownloader from "./components/VideoDownloader";

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
  
  // Store hooks
  const { load: loadLibrary, loaded: libraryLoaded, tracks } = useLibraryStore();
  const { load: loadHistory, loaded: historyLoaded, addEntry } = useHistoryStore();
  const { playQueue, currentTrack } = usePlayerStore();

  // Load data on app start
  useEffect(() => {
    if (!libraryLoaded) {
      loadLibrary();
    }
    if (!historyLoaded) {
      loadHistory();
    }
  }, [loadLibrary, libraryLoaded, loadHistory, historyLoaded]);

  // Track history when songs are played
  useEffect(() => {
    if (currentTrack) {
      // Add to history when a track starts playing
      addEntry(currentTrack.id, 0);
    }
  }, [currentTrack, addEntry]);

  // Handle artist selection
  const handleOpenArtist = (artistId, artistName) => {
    console.log(`Opening artist: ${artistName} (${artistId})`);
    
    // Get all tracks by this artist and play them
    const artistTracks = tracks.filter(track => track.artistId === artistId);
    
    if (artistTracks.length > 0) {
      playQueue(artistTracks);
    }
  };

  // Handle view changes
  const handleViewChange = (view, data) => {
    setCurrentView(view);
    if (view === 'playlist') {
      setCurrentPlaylistId(data);
    } else {
      setCurrentPlaylistId(null);
    }
  };

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return (
          <div className="p-8 space-y-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Bon{new Date().getHours() < 18 ? (new Date().getHours() < 12 ? 'jour' : ' après-midi') : 'soir'}
              </h1>
              <p className="text-gray-400 text-lg">
                Que souhaitez-vous écouter aujourd'hui ?
              </p>
            </div>

            {/* Quick Access Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {[
                { name: 'Titres likés', color: 'from-purple-500 to-pink-500', count: tracks.length },
                { name: 'Mix du jour', color: 'from-orange-500 to-red-500', count: Math.min(tracks.length, 50) },
                { name: 'Découverte', color: 'from-green-500 to-teal-500', count: tracks.length },
                { name: 'Récents', color: 'from-blue-500 to-cyan-500', count: Math.min(tracks.length, 20) },
                { name: 'Rock', color: 'from-red-500 to-pink-500', count: Math.floor(tracks.length * 0.3) },
                { name: 'Pop', color: 'from-pink-500 to-purple-500', count: Math.floor(tracks.length * 0.4) }
              ].map((item, index) => (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${item.color} rounded-lg p-4 cursor-pointer hover:scale-105 transition-transform`}
                >
                  <h3 className="text-white font-semibold text-lg">{item.name}</h3>
                  <p className="text-white/80 text-sm">{item.count} pistes</p>
                </div>
              ))}
            </div>

            {/* Import Section */}
            <LocalImport />
            
            {/* Artists Section */}
            <HomeArtists onOpenArtist={handleOpenArtist} />
          </div>
        );
      
      case 'search':
        return <Search />;
      
      case 'library':
        return <LibraryView />;

      case 'playlists':
        return <Playlists />;

      case 'history':
        return <History />;

      case 'downloader':
        return <VideoDownloader />;

      default:
        return (
          <div className="p-8 text-center text-gray-400">
            <h2 className="text-2xl font-bold mb-4">Vue non trouvée</h2>
            <p>Cette section est en cours de développement.</p>
          </div>
        );
    }
  };

  return (
    <div className="App min-h-screen bg-black text-white">
      <BrowserRouter>
        <div className="flex h-screen">
          {/* Sidebar Navigation */}
          <Navigation currentView={currentView} onViewChange={handleViewChange} />
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <div className="h-16 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-8">
              <div className="flex items-center gap-4">
                <button className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                  ←
                </button>
                <button className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                  →
                </button>
              </div>
              
              {/* Simplified top bar - removed Premium, Support, and User Avatar */}
              <div className="flex items-center gap-4">
                <div className="text-gray-400 text-sm">
                  {tracks.length} piste{tracks.length !== 1 ? 's' : ''} dans la bibliothèque
                </div>
              </div>
            </div>
            
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {renderCurrentView()}
            </div>
          </div>
        </div>
        
        {/* Global Player */}
        <Player />
        
        {/* Toast Notifications */}
        <Toaster />
      </BrowserRouter>
    </div>
  );
}

export default App;