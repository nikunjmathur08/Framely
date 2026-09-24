import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Movie } from '../types';

export interface ContinueWatchingItem {
  id: string;
  movie: Movie;
  progress: number; // 0-100
  season?: number;
  episode?: number;
  lastWatched: number;
}

/**
 * Hook to get continue watching items from watch history.
 * Combines watch history with movie data to create displayable items.
 * Falls back to a minimal Movie stub for entries (e.g. TV shows) that
 * are not present in the allMovies pool, so they are never silently dropped.
 *
 * @param allMovies - All available movies from the store to match against
 * @returns Array of continue watching items sorted by last watched (most recent first)
 */
export function useContinueWatching(allMovies: Movie[]): ContinueWatchingItem[] {
  const watchHistory = useAppStore((state) => state.watchHistory);

  return useMemo(() => {
    const items: ContinueWatchingItem[] = [];

    // Create a map for quick movie lookup
    const movieMap = new Map<number, Movie>();
    allMovies.forEach((movie) => {
      if (movie?.id) {
        movieMap.set(movie.id, movie);
      }
    });

    // Process watch history
    Object.entries(watchHistory).forEach(([id, history]) => {
      // Skip items with no timestamp (never actually watched)
      if (!history.timestamp || history.timestamp < 10) return;
      
      // Skip items that are nearly complete (>95%)
      const progress = history.duration 
        ? Math.min(100, (history.timestamp / history.duration) * 100)
        : 0;
      
      if (progress > 95) return; // Already finished

      // Find the movie in our data
      const movieId = parseInt(id, 10);
      let movie = movieMap.get(movieId);

      // If not found in the pool (e.g. a TV show navigated to directly),
      // build a minimal stub so the card can still be rendered.
      // The card will show a placeholder poster/backdrop until the user
      // revisits the title and full metadata is available.
      if (!movie && history.mediaType) {
        movie = {
          id: movieId,
          title: undefined,
          name: undefined,
          backdrop_path: null,
          poster_path: null,
          overview: '',
          vote_average: 0,
          genre_ids: [],
          media_type: history.mediaType,
        } satisfies Movie;
      }

      if (movie) {
        items.push({
          id,
          movie,
          progress,
          season: history.season,
          episode: history.episode,
          lastWatched: history.lastWatched,
        });
      }
    });

    // Sort by most recently watched first
    items.sort((a, b) => b.lastWatched - a.lastWatched);

    // Limit to 10 items
    return items.slice(0, 10);
  }, [watchHistory, allMovies]);
}
