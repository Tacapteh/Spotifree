export interface Track {
  id: string;
  source: "jamendo" | "audius" | "fma" | "youtube";
  title: string;
  artist: string;
  durationMs?: number;
  artworkUrl?: string;
  playback: {
    kind: "direct" | "hls" | "youtube-embed";
    url?: string;
    mime?: string;
  };
}
