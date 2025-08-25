import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { dbGet, dbSet } from '../lib/storage';

const STORAGE_KEY = 'listening_history';

export const useHistoryStore = create((set, get) => ({
  // State
  history: [], // Array of history entries
  loaded: false,

  // Load history from storage
  load: async () => {
    try {
      const history = await dbGet(STORAGE_KEY);
      set({
        history: history || [],
        loaded: true
      });
    } catch (error) {
      console.error('Failed to load history:', error);
      set({ loaded: true });
    }
  },

  // Save history to storage
  save: async () => {
    const state = get();
    try {
      await dbSet(STORAGE_KEY, state.history);
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  },

  // Add a new history entry
  addEntry: async (trackId, progress = 0) => {
    const state = get();
    const now = new Date();
    
    // Remove existing entry for the same track if it exists
    const filteredHistory = state.history.filter(entry => entry.trackId !== trackId);
    
    const newEntry = {
      id: nanoid(),
      trackId,
      playedAt: now,
      progress // 0-1 representing how much of the track was played
    };

    const updatedHistory = [newEntry, ...filteredHistory].slice(0, 100); // Keep only last 100 entries

    set({ history: updatedHistory });
    
    // Auto-save
    await get().save();
  },

  // Update progress for existing entry
  updateProgress: async (trackId, progress) => {
    const state = get();
    const updatedHistory = state.history.map(entry => 
      entry.trackId === trackId 
        ? { ...entry, progress, playedAt: new Date() }
        : entry
    );

    set({ history: updatedHistory });
    await get().save();
  },

  // Clear all history
  clearHistory: async () => {
    set({ history: [] });
    await get().save();
  },

  // Get recent tracks (tracks played in last 7 days)
  getRecentTracks: () => {
    const state = get();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return state.history
      .filter(entry => new Date(entry.playedAt) > sevenDaysAgo)
      .slice(0, 20); // Last 20 recent tracks
  },

  // Get most played tracks
  getMostPlayed: () => {
    const state = get();
    const trackPlayCount = {};
    
    // Count plays per track
    state.history.forEach(entry => {
      if (entry.progress > 0.3) { // Only count if played more than 30%
        trackPlayCount[entry.trackId] = (trackPlayCount[entry.trackId] || 0) + 1;
      }
    });

    // Sort by play count and return track IDs
    return Object.entries(trackPlayCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([trackId, count]) => ({ trackId, playCount: count }));
  },

  // Get listening time for today
  getTodayListeningTime: () => {
    const state = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEntries = state.history.filter(entry => {
      const entryDate = new Date(entry.playedAt);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });

    // Estimate listening time based on progress (this is approximate)
    return todayEntries.reduce((total, entry) => {
      // Assume average track length of 3.5 minutes for estimation
      const estimatedTrackLength = 3.5 * 60 * 1000; // 3.5 minutes in ms
      return total + (estimatedTrackLength * entry.progress);
    }, 0);
  }
}));