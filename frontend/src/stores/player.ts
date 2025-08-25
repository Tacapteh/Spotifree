import { create } from 'zustand';
import { Track } from '../lib/types';

interface PlayerState {
  // Current track and audio source
  currentSrc: string | null;
  currentTrack: Track | null;
  
  // Playback state
  playing: boolean;
  progress: number; // 0-1
  duration: number; // in seconds
  volume: number; // 0-1
  
  // Playlist/queue
  queue: Track[];
  currentIndex: number;
  
  // Shuffle and repeat
  shuffle: boolean;
  repeat: 'none' | 'all' | 'one';
}

interface PlayerActions {
  // Playback controls
  setPlaying: (playing: boolean) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  
  // Track management
  playTrack: (track: Track) => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  
  // Navigation
  playNext: () => void;
  playPrevious: () => void;
  skipToIndex: (index: number) => void;
  
  // Modes
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  
  // Event handlers
  onEnded: () => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onLoadedMetadata: (duration: number) => void;
}

type PlayerStore = PlayerState & PlayerActions;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // Initial state
  currentSrc: null,
  currentTrack: null,
  playing: false,
  progress: 0,
  duration: 0,
  volume: 0.7,
  queue: [],
  currentIndex: -1,
  shuffle: false,
  repeat: 'none',

  // Playback controls
  setPlaying: (playing) => set({ playing }),
  
  setProgress: (progress) => set({ progress }),
  
  setDuration: (duration) => set({ duration }),
  
  setVolume: (volume) => set({ volume }),

  // Track management
  playTrack: (track) => {
    const src = track.objectUrl || track.sourceId;
    set({
      currentTrack: track,
      currentSrc: src,
      queue: [track],
      currentIndex: 0,
      playing: true,
      progress: 0
    });
  },

  playQueue: (tracks, startIndex = 0) => {
    if (tracks.length === 0) return;
    
    const safeIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    const track = tracks[safeIndex];
    const src = track.objectUrl || track.sourceId;
    
    set({
      queue: tracks,
      currentIndex: safeIndex,
      currentTrack: track,
      currentSrc: src,
      playing: true,
      progress: 0
    });
  },

  addToQueue: (track) => {
    const state = get();
    set({
      queue: [...state.queue, track]
    });
  },

  removeFromQueue: (index) => {
    const state = get();
    const newQueue = state.queue.filter((_, i) => i !== index);
    
    let newIndex = state.currentIndex;
    if (index < state.currentIndex) {
      newIndex = state.currentIndex - 1;
    } else if (index === state.currentIndex) {
      // If removing current track, stop playback or move to next
      if (newQueue.length === 0) {
        set({
          queue: [],
          currentTrack: null,
          currentSrc: null,
          currentIndex: -1,
          playing: false
        });
        return;
      } else {
        newIndex = Math.min(newIndex, newQueue.length - 1);
      }
    }
    
    const currentTrack = newQueue[newIndex] || null;
    const currentSrc = currentTrack ? (currentTrack.objectUrl || currentTrack.sourceId) : null;
    
    set({
      queue: newQueue,
      currentIndex: newIndex,
      currentTrack,
      currentSrc
    });
  },

  clearQueue: () => set({
    queue: [],
    currentIndex: -1,
    currentTrack: null,
    currentSrc: null,
    playing: false
  }),

  // Navigation
  playNext: () => {
    const state = get();
    if (state.queue.length === 0) return;
    
    let nextIndex: number;
    
    if (state.repeat === 'one') {
      nextIndex = state.currentIndex;
    } else if (state.shuffle) {
      // Simple shuffle: random track (could be improved with proper shuffle algorithm)
      nextIndex = Math.floor(Math.random() * state.queue.length);
    } else {
      nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.queue.length) {
        if (state.repeat === 'all') {
          nextIndex = 0;
        } else {
          // End of queue, stop playing
          set({ playing: false, progress: 1 });
          return;
        }
      }
    }
    
    const track = state.queue[nextIndex];
    const src = track.objectUrl || track.sourceId;
    
    set({
      currentIndex: nextIndex,
      currentTrack: track,
      currentSrc: src,
      playing: true,
      progress: 0
    });
  },

  playPrevious: () => {
    const state = get();
    if (state.queue.length === 0) return;
    
    let prevIndex: number;
    
    if (state.shuffle) {
      // For shuffle, just go to previous in queue (could be improved with history)
      prevIndex = Math.max(0, state.currentIndex - 1);
    } else {
      prevIndex = state.currentIndex - 1;
      if (prevIndex < 0) {
        if (state.repeat === 'all') {
          prevIndex = state.queue.length - 1;
        } else {
          prevIndex = 0; // Stay at first track
        }
      }
    }
    
    const track = state.queue[prevIndex];
    const src = track.objectUrl || track.sourceId;
    
    set({
      currentIndex: prevIndex,
      currentTrack: track,
      currentSrc: src,
      playing: true,
      progress: 0
    });
  },

  skipToIndex: (index) => {
    const state = get();
    if (index < 0 || index >= state.queue.length) return;
    
    const track = state.queue[index];
    const src = track.objectUrl || track.sourceId;
    
    set({
      currentIndex: index,
      currentTrack: track,
      currentSrc: src,
      playing: true,
      progress: 0
    });
  },

  // Modes
  toggleShuffle: () => {
    const state = get();
    set({ shuffle: !state.shuffle });
  },

  toggleRepeat: () => {
    const state = get();
    const modes: Array<'none' | 'all' | 'one'> = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(state.repeat);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    set({ repeat: nextMode });
  },

  // Event handlers
  onEnded: () => {
    const actions = get();
    actions.playNext();
  },

  onTimeUpdate: (currentTime, duration) => {
    const progress = duration > 0 ? currentTime / duration : 0;
    set({ progress, duration });
  },

  onLoadedMetadata: (duration) => {
    set({ duration });
  }
}));