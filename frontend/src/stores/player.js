import { create } from 'zustand';

export const usePlayerStore = create((set, get) => ({
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

  // Navigation
  playNext: () => {
    const state = get();
    if (state.queue.length === 0) return;
    
    let nextIndex;
    
    if (state.repeat === 'one') {
      nextIndex = state.currentIndex;
    } else if (state.shuffle) {
      nextIndex = Math.floor(Math.random() * state.queue.length);
    } else {
      nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.queue.length) {
        if (state.repeat === 'all') {
          nextIndex = 0;
        } else {
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
    
    let prevIndex;
    
    if (state.shuffle) {
      prevIndex = Math.max(0, state.currentIndex - 1);
    } else {
      prevIndex = state.currentIndex - 1;
      if (prevIndex < 0) {
        if (state.repeat === 'all') {
          prevIndex = state.queue.length - 1;
        } else {
          prevIndex = 0;
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

  // Modes
  toggleShuffle: () => {
    const state = get();
    set({ shuffle: !state.shuffle });
  },

  toggleRepeat: () => {
    const state = get();
    const modes = ['none', 'all', 'one'];
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