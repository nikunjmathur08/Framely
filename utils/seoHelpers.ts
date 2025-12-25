import { Movie, TvShowDetails } from '../types';
import { SEO_CONFIG, API_CONFIG, IMAGE_SIZES } from '../constants';

/**
 * Generate a URL-safe slug from a title
 * @param title - Movie or TV show title
 * @returns URL-safe slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

/**
 * Get full image URL from TMDB path
 */
export function getFullImageUrl(
  path: string | null | undefined,
  size: 'backdrop' | 'poster' = 'backdrop',
  quality: 'small' | 'medium' | 'large' | 'original' = 'large'
): string {
  if (!path) return SEO_CONFIG.defaultImage;
  return `${API_CONFIG.imageBaseUrl}/${IMAGE_SIZES[size][quality]}${path}`;
}

/**
 * Generate JSON-LD schema for a Movie
 */
export function generateMovieSchema(movie: Movie) {
  const title = movie.title || movie.name || 'Unknown';
  const releaseDate = movie.release_date || movie.first_air_date;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: title,
    description: movie.overview || `Watch ${title} on Framely`,
    image: getFullImageUrl(movie.poster_path, 'poster', 'large'),
    datePublished: releaseDate,
    aggregateRating: movie.vote_average ? {
      '@type': 'AggregateRating',
      ratingValue: movie.vote_average.toFixed(1),
      bestRating: '10',
      worstRating: '0',
      ratingCount: movie.vote_count || 100,
    } : undefined,
    url: `${SEO_CONFIG.baseUrl}/movie/${movie.id}/${generateSlug(title)}`,
    potentialAction: {
      '@type': 'WatchAction',
      target: `${SEO_CONFIG.baseUrl}/watch/movie/${movie.id}`,
    },
  };
}

/**
 * Generate JSON-LD schema for a TV Show
 */
export function generateTvSchema(show: TvShowDetails | Movie) {
  const title = show.name || show.title || 'Unknown';
  const releaseDate = show.first_air_date || show.release_date;
  
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: title,
    description: show.overview || `Watch ${title} on Framely`,
    image: getFullImageUrl(show.poster_path, 'poster', 'large'),
    datePublished: releaseDate,
    url: `${SEO_CONFIG.baseUrl}/tv/${show.id}/${generateSlug(title)}`,
    potentialAction: {
      '@type': 'WatchAction',
      target: `${SEO_CONFIG.baseUrl}/watch/tv/${show.id}`,
    },
  };

  if (show.vote_average) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: show.vote_average.toFixed(1),
      bestRating: '10',
      worstRating: '0',
      ratingCount: show.vote_count || 100,
    };
  }

  // Add season information if available
  if ('number_of_seasons' in show && show.number_of_seasons) {
    schema.numberOfSeasons = show.number_of_seasons;
  }
  if ('number_of_episodes' in show && show.number_of_episodes) {
    schema.numberOfEpisodes = show.number_of_episodes;
  }

  return schema;
}

/**
 * Generate breadcrumb JSON-LD schema
 */
export function generateBreadcrumbs(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate SEO-friendly URL for a movie or TV show
 */
export function generateSeoUrl(type: 'movie' | 'tv', id: number, title: string): string {
  const slug = generateSlug(title);
  return `/${type}/${id}/${slug}`;
}

/**
 * Generate canonical URL
 */
export function generateCanonicalUrl(path: string): string {
  return `${SEO_CONFIG.baseUrl}${path}`;
}

/**
 * Extract keywords from movie/show data for meta tags
 */
export function extractKeywords(item: Movie, genres?: string[]): string[] {
  const keywords: string[] = [
    'streaming',
    'watch online',
    'free',
    item.title || item.name || '',
    item.media_type === 'tv' ? 'tv show' : 'movie',
    ...(genres || []),
  ].filter(Boolean);

  return [...new Set(keywords)]; // Remove duplicates
}
