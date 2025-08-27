import React from 'react';
import { Home, Search as SearchIcon, BookOpen, Clock, Download, Music, Library, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { useLibraryStore } from '../stores/library';

const Navigation = ({ currentView, onViewChange }) => {
  const { playlists } = useLibraryStore();

  const mainNavItems = [
    { id: 'home', icon: Home, label: 'Accueil' },
    { id: 'search', icon: SearchIcon, label: 'Rechercher' },
    { id: 'library', icon: Library, label: 'Votre bibliothèque' },
    { id: 'downloader', icon: Download, label: 'Téléchargeur' },
  ];

  const libraryItems = [
    { id: 'playlists', icon: BookOpen, label: 'Playlists' },
    { id: 'history', icon: Clock, label: 'Historique' },
  ];

  return (
    <div className="w-64 h-full bg-black text-white flex flex-col border-r border-gray-800">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="text-black font-bold text-sm">♪</div>
          </div>
          <span className="font-bold text-xl">Spotifree</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="px-6 mb-6">
        {mainNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex items-center gap-4 w-full p-2 rounded-md text-left transition-colors ${
              currentView === item.id 
                ? 'text-white bg-gray-800' 
                : 'text-gray-400 hover:text-white hover:bg-gray-900'
            }`}
          >
            <item.icon size={24} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Library Section */}
      <div className="px-6 mb-6">
        <h3 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wider">
          Votre bibliothèque
        </h3>
        
        {libraryItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex items-center gap-4 w-full p-2 rounded-md text-left transition-colors ${
              currentView === item.id 
                ? 'text-white bg-gray-800' 
                : 'text-gray-400 hover:text-white hover:bg-gray-900'
            }`}
          >
            <item.icon size={20} />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="border-t border-gray-800 mx-6 mb-4"></div>

      {/* Create Playlist */}
      <div className="px-6 mb-6">
        <button
          onClick={() => onViewChange('playlists')}
          className="flex items-center gap-4 w-full p-2 text-gray-400 hover:text-white transition-colors"
        >
          <Plus size={20} />
          <span className="text-sm">Créer une playlist</span>
        </button>
      </div>

      {/* Playlists List */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-1">
          {playlists.slice(0, 10).map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => onViewChange('playlist', playlist.id)}
              className="block w-full text-left py-2 text-gray-400 hover:text-white text-sm transition-colors truncate"
            >
              {playlist.name}
            </button>
          ))}
          {playlists.length > 10 && (
            <button
              onClick={() => onViewChange('playlists')}
              className="block w-full text-left py-2 text-gray-500 hover:text-gray-400 text-xs transition-colors"
            >
              Voir toutes les playlists ({playlists.length})
            </button>
          )}
        </div>
      </div>

      {/* Install App */}
      <div className="p-6 border-t border-gray-800">
        <button className="flex items-center gap-4 w-full p-2 text-gray-400 hover:text-white transition-colors">
          <Download size={20} />
          <span className="text-sm font-medium">Installer l'app</span>
        </button>
      </div>
    </div>
  );
};

export default Navigation;