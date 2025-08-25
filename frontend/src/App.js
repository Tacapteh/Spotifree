import React, { useEffect } from "react";
import "./App.css";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { useLibraryStore } from "./stores/library";
import LocalImport from "./components/LocalImport";
import HomeArtists from "./components/HomeArtists";
import Player from "./components/Player";
import { usePlayerStore } from "./stores/player";

function App() {
  const { load, loaded } = useLibraryStore();
  const playQueue = usePlayerStore(state => state.playQueue);
  const getPlaylistTracks = useLibraryStore(state => state.getPlaylistTracks);
  
  // Load library on app start
  useEffect(() => {
    if (!loaded) {
      load();
    }
  }, [load, loaded]);

  // Handle artist selection
  const handleOpenArtist = (artistId, artistName) => {
    console.log(`Opening artist: ${artistName} (${artistId})`);
    
    // Get all tracks by this artist and play them
    const tracks = useLibraryStore.getState().tracks.filter(
      track => track.artistId === artistId
    );
    
    if (tracks.length > 0) {
      playQueue(tracks);
    }
  };

  return (
    <div className="App min-h-screen bg-black text-white">
      <BrowserRouter>
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <div className="text-black font-bold text-lg">♪</div>
              </div>
              <h1 className="text-4xl font-bold">Spotifree</h1>
            </div>
            <p className="text-gray-400 text-lg">
              Votre bibliothèque musicale personnelle, libre et sans limites
            </p>
          </header>

          {/* Main Content */}
          <main className="space-y-8">
            {/* Import Section */}
            <LocalImport />
            
            {/* Artists Section */}
            <HomeArtists onOpenArtist={handleOpenArtist} />
            
            {/* Future sections can be added here */}
            <div className="text-center py-16 text-gray-500">
              <p>Plus de fonctionnalités à venir...</p>
              <p className="text-sm mt-2">
                Playlists, recherche, historique, et bien plus encore
              </p>
            </div>
          </main>
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
