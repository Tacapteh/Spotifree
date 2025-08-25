import { useMemo } from 'react';
import { useLibraryStore } from '../stores/library';
import { Artist } from './types';

/**
 * Hook to get aggregated artists from playlists
 * Combines artistId and artistName from tracks in playlists and counts track occurrences
 */
export function useArtistsFromPlaylists(): Artist[] {
  const { tracks, playlists } = useLibraryStore();

  return useMemo(() => {
    // Get all track IDs that are in at least one playlist
    const playlistTrackIds = new Set<string>();
    playlists.forEach(playlist => {
      playlist.trackIds.forEach(trackId => {
        playlistTrackIds.add(trackId);
      });
    });

    // Get tracks that are in playlists
    const playlistTracks = tracks.filter(track => playlistTrackIds.has(track.id));

    // Aggregate by artist
    const artistMap = new Map<string, { name: string; trackCount: number }>();
    
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
export function useAllArtists(): Artist[] {
  const { tracks } = useLibraryStore();

  return useMemo(() => {
    const artistMap = new Map<string, { name: string; trackCount: number }>();
    
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

/**
 * Hook to get tracks by artist ID
 */
export function useTracksByArtist(artistId: string) {
  const { tracks } = useLibraryStore();

  return useMemo(() => {
    return tracks.filter(track => track.artistId === artistId);
  }, [tracks, artistId]);
}

/**
 * Hook to search tracks
 */
export function useSearchTracks(query: string) {
  const { tracks } = useLibraryStore();

  return useMemo(() => {
    if (!query.trim()) return [];
    
    const lowercaseQuery = query.toLowerCase();
    return tracks.filter(track => 
      track.title.toLowerCase().includes(lowercaseQuery) ||
      track.artistName.toLowerCase().includes(lowercaseQuery)
    );
  }, [tracks, query]);
}