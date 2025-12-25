/**
 * SEO Configuration Constants
 */
export const SEO_CONFIG = {
  siteName: 'Framely',
  baseUrl: 'https://framely-nm.vercel.app',
  defaultTitle: 'Framely - Stream Movies & TV Shows Online | Watch Free',
  defaultDescription: 'Watch unlimited movies and TV shows on Framely. Stream the latest releases, trending content, and classic favorites. Free streaming with no ads, high-quality video.',
  defaultImage: 'https://framely-nm.vercel.app/framely_logo.png',
  twitterHandle: '@framely',
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  tmdbBaseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p',
  backendUrl: import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001'),
} as const;

/**
 * Theme Colors
 */
export const COLORS = {
  primary: '#E50914',
  dark: '#141414',
  gray: '#e5e5e5',
  success: '#46d369',
} as const;

/**
 * Image Sizes for TMDB
 */
export const IMAGE_SIZES = {
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original',
  },
  profile: {
    small: 'w45',
    medium: 'w185',
    large: 'h632',
    original: 'original',
  },
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  movieDataTTL: 30 * 60 * 1000, // 30 minutes
  trailerCacheTTL: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Player Configurations
 */
export const PLAYER_CONFIGS = [
  {
    id: 'vidking',
    name: 'Vidking',
    baseUrl: 'https://www.vidking.net/embed',
  },
  {
    id: 'videasy',
    name: 'Videasy',
    baseUrl: 'https://player.videasy.net',
  },
  {
    id: 'vidplus',
    name: 'VidPlus',
    baseUrl: 'https://player.vidplus.to/embed',
  },
  {
    id: 'mappleuk',
    name: 'MappleUK',
    baseUrl: 'https://mapple.uk/watch',
  },
] as const;

/**
 * Default Player ID
 */
export const DEFAULT_PLAYER = 'mappleuk';
