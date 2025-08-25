export interface Track {
  id: string;
  source: 'local' | 'youtube' | 'spotify';
  sourceId: string;
  title: string;
  artistName: string;
  artistId: string;
  durationMs: number;
  artworkUrl?: string;
  playable: 'local' | 'embed' | 'direct';
  objectUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: Date;
  trackIds: string[];
}

export interface History {
  id: string;
  trackId: string;
  playedAt: Date;
  progress: number; // 0-1 representing playback progress
}

export interface Artist {
  id: string;
  name: string;
  trackCount: number;
}

export interface PlayerState {
  currentSrc: string | null;
  currentTrack: Track | null;
  playing: boolean;
  progress: number;
  duration: number;
}

export interface LibraryState {
  tracks: Track[];
  playlists: Playlist[];
  loaded: boolean;
}