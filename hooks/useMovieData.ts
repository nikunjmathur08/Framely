import { useAppStore, MovieData } from '../store/useAppStore';

// Re-export MovieData type for backward compatibility
export type { MovieData };

/**
 * Hook to access movie data from the global store.
 * Data is cached and persisted, so subsequent calls return instantly.
 * 
 * Note: Call useAppStore.getState().fetchMovieData() to trigger a fetch.
 * This hook only reads the cached data.
 */
export function useMovieData() {
  const data = useAppStore((state) => state.movieData);
  const loading = useAppStore((state) => state.movieDataLoading);
  const error = useAppStore((state) => state.movieDataError);

  return { data, loading, error };
}
