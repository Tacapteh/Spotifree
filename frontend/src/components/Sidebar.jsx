import React from 'react';
import { Home, Search, Library, Plus, Heart, Download } from 'lucide-react';
import { Button } from './ui/button';

const Sidebar = () => {
  const navItems = [
    { icon: Home, label: 'Home', active: true },
    { icon: Search, label: 'Search' },
    { icon: Library, label: 'Your Library' }
  ];

  const playlists = [
    'Liked Songs',
    'My Playlist #1',
    'Discover Weekly', 
    'Release Radar',
    'Daily Mix 1',
    'Chill Hits',
    'Rock Classics'
  ];

  return (
    <div className="w-64 h-full bg-black text-white flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="text-black font-bold text-sm">♪</div>
          </div>
          <span className="font-bold text-xl">Spotify</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-6 mb-6">
        {navItems.map((item, index) => (
          <button
            key={index}
            className={`flex items-center gap-4 w-full p-2 rounded-md text-left hover:text-white transition-colors ${
              item.active ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <item.icon size={24} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Create Playlist */}
      <div className="px-6 mb-6">
        <button className="flex items-center gap-4 w-full p-2 text-gray-400 hover:text-white transition-colors">
          <Plus size={24} />
          <span className="font-medium">Create Playlist</span>
        </button>
        <button className="flex items-center gap-4 w-full p-2 text-gray-400 hover:text-white transition-colors">
          <Heart size={24} />
          <span className="font-medium">Liked Songs</span>
        </button>
        <button className="flex items-center gap-4 w-full p-2 text-gray-400 hover:text-white transition-colors">
          <Download size={24} />
          <span className="font-medium">Downloaded</span>
        </button>
      </div>

      {/* Separator */}
      <div className="border-t border-gray-800 mx-6 mb-4"></div>

      {/* Playlists */}
      <div className="flex-1 overflow-y-auto px-6">
        {playlists.map((playlist, index) => (
          <div
            key={index}
            className="py-2 text-gray-400 hover:text-white cursor-pointer transition-colors text-sm"
          >
            {playlist}
          </div>
        ))}
      </div>

      {/* Install App */}
      <div className="p-6 border-t border-gray-800">
        <button className="flex items-center gap-4 w-full p-2 text-gray-400 hover:text-white transition-colors">
          <Download size={20} />
          <span className="text-sm font-medium">Install App</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;