// MusicBrainz API service for artist information and images
const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const COVERART_API = 'https://coverartarchive.org';
const LASTFM_API = 'https://ws.audioscrobbler.com/2.0';
const LASTFM_API_KEY = '7ac0e7a8d3e3bb2cde00c2b0d8e63b9f'; // Public key for testing

// Cache for artist data to avoid repeated requests
const artistCache = new Map();
const imageCache = new Map();

/**
 * Search for artist information using MusicBrainz
 */
export const searchArtist = async (artistName) => {
  if (!artistName || artistName.toLowerCase() === 'unknown artist') {
    return null;
  }

  // Check cache first
  const cacheKey = artistName.toLowerCase().trim();
  if (artistCache.has(cacheKey)) {
    return artistCache.get(cacheKey);
  }

  try {
    const encodedArtist = encodeURIComponent(artistName);
    const response = await fetch(
      `${MUSICBRAINZ_API}/artist?query=artist:${encodedArtist}&fmt=json&limit=1`,
      {
        headers: {
          'User-Agent': 'Spotifree/1.0 (https://spotifree.app)'
        }
      }
    );

    if (!response.ok) throw new Error('MusicBrainz API error');

    const data = await response.json();
    
    if (data.artists && data.artists.length > 0) {
      const artist = data.artists[0];
      const artistInfo = {
        id: artist.id,
        name: artist.name,
        disambiguation: artist.disambiguation,
        type: artist.type,
        gender: artist.gender,
        country: artist.country,
        beginArea: artist['begin-area']?.name,
        tags: artist.tags?.map(tag => tag.name) || [],
        genres: []
      };

      // Cache the result
      artistCache.set(cacheKey, artistInfo);
      return artistInfo;
    }
  } catch (error) {
    console.warn('Failed to fetch artist info from MusicBrainz:', error);
  }

  return null;
};

/**
 * Get artist image from Last.fm
 */
export const getArtistImage = async (artistName) => {
  if (!artistName || artistName.toLowerCase() === 'unknown artist') {
    return null;
  }

  // Check cache first
  const cacheKey = artistName.toLowerCase().trim();
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }

  try {
    const encodedArtist = encodeURIComponent(artistName);
    const response = await fetch(
      `${LASTFM_API}?method=artist.getinfo&artist=${encodedArtist}&api_key=${LASTFM_API_KEY}&format=json`
    );

    if (!response.ok) throw new Error('Last.fm API error');

    const data = await response.json();
    
    if (data.artist && data.artist.image) {
      // Get the largest image available
      const images = data.artist.image;
      const largeImage = images.find(img => img.size === 'extralarge') || 
                        images.find(img => img.size === 'large') ||
                        images.find(img => img.size === 'medium') ||
                        images[images.length - 1];

      if (largeImage && largeImage['#text']) {
        const imageUrl = largeImage['#text'];
        imageCache.set(cacheKey, imageUrl);
        return imageUrl;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch artist image from Last.fm:', error);
  }

  return null;
};

/**
 * Detect music genre/style from artist name and track title
 */
export const detectGenre = async (artistName, trackTitle = '') => {
  try {
    const artistInfo = await searchArtist(artistName);
    if (artistInfo && artistInfo.tags && artistInfo.tags.length > 0) {
      // Return the most relevant tag as genre
      return artistInfo.tags[0];
    }

    // Fallback: Simple keyword-based genre detection
    const text = `${artistName} ${trackTitle}`.toLowerCase();
    
    const genreKeywords = {
      'rock': ['rock', 'metal', 'punk', 'grunge', 'alternative'],
      'pop': ['pop', 'mainstream', 'chart', 'radio'],
      'hip-hop': ['hip', 'hop', 'rap', 'trap', 'drill'],
      'electronic': ['electronic', 'edm', 'techno', 'house', 'dubstep', 'synth'],
      'jazz': ['jazz', 'blues', 'swing', 'bebop'],
      'classical': ['classical', 'orchestra', 'symphony', 'piano', 'violin'],
      'country': ['country', 'folk', 'bluegrass', 'americana'],
      'r&b': ['r&b', 'soul', 'funk', 'motown'],
      'reggae': ['reggae', 'ska', 'dub', 'jamaican'],
      'latin': ['latin', 'salsa', 'bachata', 'reggaeton', 'spanish']
    };

    for (const [genre, keywords] of Object.entries(genreKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return genre;
      }
    }

    return 'music'; // Default fallback
  } catch (error) {
    console.warn('Failed to detect genre:', error);
    return 'music';
  }
};

/**
 * Get comprehensive artist data including image and genre
 */
export const getArtistData = async (artistName) => {
  if (!artistName || artistName.toLowerCase() === 'unknown artist') {
    return {
      name: artistName,
      image: null,
      genre: 'music',
      info: null
    };
  }

  try {
    const [artistInfo, artistImage] = await Promise.all([
      searchArtist(artistName),
      getArtistImage(artistName)
    ]);

    const genre = artistInfo?.tags?.[0] || await detectGenre(artistName);

    return {
      name: artistName,
      image: artistImage,
      genre: genre,
      info: artistInfo
    };
  } catch (error) {
    console.warn('Failed to get comprehensive artist data:', error);
    return {
      name: artistName,
      image: null,
      genre: 'music',
      info: null
    };
  }
};

/**
 * Clear caches (useful for testing or memory management)
 */
export const clearCache = () => {
  artistCache.clear();
  imageCache.clear();
};