import { useMemo } from 'react';
import { useLibraryStore } from '../stores/library';

/**
 * Hook to get aggregated artists from playlists
 * Combines artistId and artistName from tracks in playlists and counts track occurrences
 */
export function useArtistsFromPlaylists() {
  const { tracks, playlists } = useLibraryStore();

  return useMemo(() => {
    // Get all track IDs that are in at least one playlist
    const playlistTrackIds = new Set();
    playlists.forEach(playlist => {
      playlist.trackIds.forEach(trackId => {
        playlistTrackIds.add(trackId);
      });
    });

    // Get tracks that are in playlists
    const playlistTracks = tracks.filter(track => playlistTrackIds.has(track.id));

    // Aggregate by artist
    const artistMap = new Map();
    
    playlistTracks.forEach(track => {
      const existing = artistMap.get(track.artistId);
      if (existing) {
        existing.trackCount += 1;
      } else {
        artistMap.set(track.artistId, {
          name: track.artistName,
          trackCount: 1
        });
      }
    });

    // Convert to Artist array and sort by track count (descending)
    return Array.from(artistMap.entries())
      .map(([id, { name, trackCount }]) => ({
        id,
        name,
        trackCount
      }))
      .sort((a, b) => b.trackCount - a.trackCount);
  }, [tracks, playlists]);
}

/**
 * Hook to get all unique artists from library
 */
export function useAllArtists() {
  const { tracks } = useLibraryStore();

  return useMemo(() => {
    const artistMap = new Map();
    
    tracks.forEach(track => {
      const existing = artistMap.get(track.artistId);
      if (existing) {
        existing.trackCount += 1;
      } else {
        artistMap.set(track.artistId, {
          name: track.artistName,
          trackCount: 1
        });
      }
    });

    return Array.from(artistMap.entries())
      .map(([id, { name, trackCount }]) => ({
        id,
        name,
        trackCount
      }))
      .sort((a, b) => b.trackCount - a.trackCount);
  }, [tracks]);
}