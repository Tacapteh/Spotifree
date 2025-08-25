import React from 'react';
import { Play, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';

const MainContent = ({ onTrackSelect }) => {
  const trendingSongs = [
    {
      id: 1,
      title: "Jealous Type",
      artist: "Doja Cat",
      image: "https://i.scdn.co/image/ab67616d0000b273f8b9eb6e99a78c0ceef6c695",
      duration: "3:23"
    },
    {
      id: 2,
      title: "Lover Girl",
      artist: "Laufey",
      image: "https://i.scdn.co/image/ab67616d0000b273334681c668ae4b670f89f200",
      duration: "4:12"
    },
    {
      id: 3,
      title: "Hell At Night",
      artist: "BigXthePlug",
      image: "https://i.scdn.co/image/ab67616d0000b273298a22bb2deb3826db7ce572",
      duration: "2:58"
    },
    {
      id: 4,
      title: "CEREMONY",
      artist: "Stray Kids",
      image: "https://i.scdn.co/image/ab67616d0000b273b19e517da0e2ff33b3cb7d8c",
      duration: "3:45"
    },
    {
      id: 5,
      title: "4Ever",
      artist: "Jamz, Juice WRLD",
      image: "https://i.scdn.co/image/ab67616d0000b273c024cf43f1248ce580cb0b9c",
      duration: "3:28"
    },
    {
      id: 6,
      title: "infinite source",
      artist: "Deftones",
      image: "https://i.scdn.co/image/ab67616d0000b273b171c7ac76b2d5589871e622",
      duration: "4:01"
    }
  ];

  const popularArtists = [
    {
      id: 1,
      name: "Kendrick Lamar",
      type: "Artist",
      image: "https://i.scdn.co/image/ab6761610000e5ebec0bec17ee78b0500a42c0b0"
    },
    {
      id: 2,
      name: "Drake",
      type: "Artist", 
      image: "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9"
    },
    {
      id: 3,
      name: "The Weeknd",
      type: "Artist",
      image: "https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb"
    },
    {
      id: 4,
      name: "Morgan Wallen", 
      type: "Artist",
      image: "https://i.scdn.co/image/ab6761610000e5eb8773b617014c4c5b0d2cd023"
    },
    {
      id: 5,
      name: "Post Malone",
      type: "Artist",
      image: "https://i.scdn.co/image/ab6761610000e5eb544b8b1a42c6fe07942e4bb6"
    },
    {
      id: 6,
      name: "Rihanna",
      type: "Artist",
      image: "https://i.scdn.co/image/ab6761610000e5eb99e4fca7c0b7cb166d915789"
    }
  ];

  const SongCard = ({ song, index }) => (
    <div 
      className="group relative bg-gray-900 p-4 rounded-lg hover:bg-gray-800 transition-all duration-300 cursor-pointer"
      onClick={() => onTrackSelect(song)}
    >
      <div className="relative">
        <img 
          src={song.image} 
          alt={song.title}
          className="w-full aspect-square object-cover rounded-md mb-4"
        />
        <Button
          className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-green-500 hover:bg-green-400 text-black opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg"
        >
          <Play size={20} fill="currentColor" />
        </Button>
      </div>
      <h3 className="text-white font-medium text-sm mb-1 line-clamp-1">{song.title}</h3>
      <p className="text-gray-400 text-xs line-clamp-2">{song.artist}</p>
    </div>
  );

  const ArtistCard = ({ artist }) => (
    <div className="group relative bg-gray-900 p-4 rounded-lg hover:bg-gray-800 transition-all duration-300 cursor-pointer">
      <div className="relative">
        <img 
          src={artist.image} 
          alt={artist.name}
          className="w-full aspect-square object-cover rounded-full mb-4"
        />
        <Button
          className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-green-500 hover:bg-green-400 text-black opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg"
        >
          <Play size={20} fill="currentColor" />
        </Button>
      </div>
      <h3 className="text-white font-medium text-sm mb-1 line-clamp-1">{artist.name}</h3>
      <p className="text-gray-400 text-xs">{artist.type}</p>
    </div>
  );

  return (
    <div className="flex-1 bg-gradient-to-b from-gray-800 to-black text-white overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button className="w-8 h-8 rounded-full bg-black bg-opacity-70 flex items-center justify-center text-gray-400">
              ←
            </button>
            <button className="w-8 h-8 rounded-full bg-black bg-opacity-70 flex items-center justify-center text-gray-400">
              →
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-white hover:text-gray-300">Premium</Button>
            <Button variant="ghost" className="text-white hover:text-gray-300">Support</Button>
            <Button variant="ghost" className="text-white hover:text-gray-300">Download</Button>
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-medium">
              U
            </div>
          </div>
        </div>

        {/* Good afternoon section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-6">Good afternoon</h1>
          <div className="grid grid-cols-3 gap-4">
            {['Liked Songs', 'Daily Mix 1', 'Discover Weekly', 'Release Radar', 'Chill Hits', 'Your Top Songs 2024'].map((playlist, index) => (
              <div key={index} className="bg-gray-800 rounded-md flex items-center overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer group">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold">♪</span>
                </div>
                <span className="px-4 text-white font-medium">{playlist}</span>
                <Button
                  className="ml-auto mr-4 w-10 h-10 rounded-full bg-green-500 hover:bg-green-400 text-black opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Play size={16} fill="currentColor" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Trending songs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Trending songs</h2>
            <Button variant="ghost" className="text-gray-400 hover:text-white text-sm font-medium">
              Show all
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {trendingSongs.map((song, index) => (
              <SongCard key={song.id} song={song} index={index} />
            ))}
          </div>
        </div>

        {/* Popular artists */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Popular artists</h2>
            <Button variant="ghost" className="text-gray-400 hover:text-white text-sm font-medium">
              Show all
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {popularArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainContent;