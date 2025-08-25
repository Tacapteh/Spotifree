import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { Track, Playlist, LibraryState } from '../lib/types';
import { dbGet, dbSet } from '../lib/storage';

interface LibraryStore extends LibraryState {
  // Actions
  load: () => Promise<void>;
  save: () => Promise<void>;
  addTracks: (tracks: Track[]) => Promise<void>;
  createPlaylist: (name: string, trackIds?: string[]) => Promise<Playlist>;
  addToPlaylist: (playlistId: string, trackIds: string[]) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackIds: string[]) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  getTrack: (trackId: string) => Track | undefined;
  getPlaylist: (playlistId: string) => Playlist | undefined;
  getPlaylistTracks: (playlistId: string) => Track[];
}

const STORAGE_KEYS = {
  TRACKS: 'tracks',
  PLAYLISTS: 'playlists',
  LOADED: 'loaded'
} as const;

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  // Initial state
  tracks: [],
  playlists: [],
  loaded: false,

  // Load data from storage
  load: async () => {
    try {
      const [tracks, playlists] = await Promise.all([
        dbGet<Track[]>(STORAGE_KEYS.TRACKS),
        dbGet<Playlist[]>(STORAGE_KEYS.PLAYLISTS)
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
  addTracks: async (newTracks: Track[]) => {
    const state = get();
    const existingIds = new Set(state.tracks.map(t => t.id));
    const uniqueTracks = newTracks.filter(track => !existingIds.has(track.id));
    
    if (uniqueTracks.length === 0) return;

    const updatedTracks = [...state.tracks, ...uniqueTracks];
    set({ tracks: updatedTracks });
    
    // Auto-save
    await get().save();
  },

  // Create new playlist
  createPlaylist: async (name: string, trackIds: string[] = []) => {
    const playlist: Playlist = {
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
  addToPlaylist: async (playlistId: string, trackIds: string[]) => {
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
  removeFromPlaylist: async (playlistId: string, trackIds: string[]) => {
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
  deletePlaylist: async (playlistId: string) => {
    const state = get();
    const updatedPlaylists = state.playlists.filter(p => p.id !== playlistId);
    
    set({ playlists: updatedPlaylists });
    
    // Auto-save
    await get().save();
  },

  // Helper: Get track by ID
  getTrack: (trackId: string) => {
    const state = get();
    return state.tracks.find(t => t.id === trackId);
  },

  // Helper: Get playlist by ID
  getPlaylist: (playlistId: string) => {
    const state = get();
    return state.playlists.find(p => p.id === playlistId);
  },

  // Helper: Get all tracks in a playlist
  getPlaylistTracks: (playlistId: string) => {
    const state = get();
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (!playlist) return [];
    
    return playlist.trackIds
      .map(id => state.tracks.find(t => t.id === id))
      .filter((track): track is Track => track !== undefined);
  }
}));