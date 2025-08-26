import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { dbGet, dbSet } from '../lib/storage';

const STORAGE_KEYS = {
  TRACKS: 'tracks',
  PLAYLISTS: 'playlists',
  LOADED: 'loaded'
};

export const useLibraryStore = create((set, get) => ({
  // Initial state
  tracks: [],
  playlists: [],
  loaded: false,

  // Load data from storage
  load: async () => {
    try {
      const [tracks, playlists] = await Promise.all([
        dbGet(STORAGE_KEYS.TRACKS),
        dbGet(STORAGE_KEYS.PLAYLISTS)
      ]);

      set({
        tracks: tracks || [],
        playlists: playlists || [],
        loaded: true
      });
    } catch (error) {
      console.error('Failed to load library:', error);
      set({ loaded: true }); // Mark as loaded even on error
    }
  },

  // Save current state to storage
  save: async () => {
    const state = get();
    try {
      await Promise.all([
        dbSet(STORAGE_KEYS.TRACKS, state.tracks),
        dbSet(STORAGE_KEYS.PLAYLISTS, state.playlists)
      ]);
    } catch (error) {
      console.error('Failed to save library:', error);
    }
  },

  // Add tracks to library
  addTracks: async (newTracks) => {
    const state = get();
    const existingIds = new Set(state.tracks.map(t => t.id));
    const uniqueTracks = newTracks.filter(track => !existingIds.has(track.id));
    
    if (uniqueTracks.length === 0) return;

    const updatedTracks = [...state.tracks, ...uniqueTracks];
    set({ tracks: updatedTracks });
    
    // Auto-save
    await get().save();
  },

  // Remove tracks from library
  removeTracks: async (trackIds) => {
    const state = get();
    const removeIds = new Set(trackIds);
    
    // Remove tracks from main library
    const updatedTracks = state.tracks.filter(track => !removeIds.has(track.id));
    
    // Remove tracks from all playlists
    const updatedPlaylists = state.playlists.map(playlist => ({
      ...playlist,
      trackIds: playlist.trackIds.filter(id => !removeIds.has(id))
    }));
    
    set({
      tracks: updatedTracks,
      playlists: updatedPlaylists
    });
    
    // Auto-save
    await get().save();
  },

  // Remove single track
  removeTrack: async (trackId) => {
    await get().removeTracks([trackId]);
  },

  // Create new playlist
  createPlaylist: async (name, trackIds = []) => {
    const playlist = {
      id: nanoid(),
      name,
      createdAt: new Date(),
      trackIds
    };

    const state = get();
    const updatedPlaylists = [...state.playlists, playlist];
    set({ playlists: updatedPlaylists });
    
    // Auto-save
    await get().save();
    
    return playlist;
  },

  // Add tracks to existing playlist
  addToPlaylist: async (playlistId, trackIds) => {
    const state = get();
    const playlist = state.playlists.find(p => p.id === playlistId);
    
    if (!playlist) {
      throw new Error(`Playlist not found: ${playlistId}`);
    }

    // Avoid duplicates
    const existingIds = new Set(playlist.trackIds);
    const newTrackIds = trackIds.filter(id => !existingIds.has(id));
    
    if (newTrackIds.length === 0) return;

    const updatedPlaylists = state.playlists.map(p => 
      p.id === playlistId 
        ? { ...p, trackIds: [...p.trackIds, ...newTrackIds] }
        : p
    );

    set({ playlists: updatedPlaylists });
    
    // Auto-save
    await get().save();
  },

  // Remove tracks from playlist
  removeFromPlaylist: async (playlistId, trackIds) => {
    const state = get();
    const removeIds = new Set(trackIds);
    
    const updatedPlaylists = state.playlists.map(p => 
      p.id === playlistId 
        ? { ...p, trackIds: p.trackIds.filter(id => !removeIds.has(id)) }
        : p
    );

    set({ playlists: updatedPlaylists });
    
    // Auto-save
    await get().save();
  },

  // Delete playlist
  deletePlaylist: async (playlistId) => {
    const state = get();
    const updatedPlaylists = state.playlists.filter(p => p.id !== playlistId);
    
    set({ playlists: updatedPlaylists });
    
    // Auto-save
    await get().save();
  },

  // Helper: Get track by ID
  getTrack: (trackId) => {
    const state = get();
    return state.tracks.find(t => t.id === trackId);
  },

  // Helper: Get playlist by ID
  getPlaylist: (playlistId) => {
    const state = get();
    return state.playlists.find(p => p.id === playlistId);
  },

  // Helper: Get all tracks in a playlist
  getPlaylistTracks: (playlistId) => {
    const state = get();
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (!playlist) return [];
    
    return playlist.trackIds
      .map(id => state.tracks.find(t => t.id === id))
      .filter(track => track !== undefined);
  }
}));