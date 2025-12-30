import { useEffect, useState, useCallback } from "react";
import { resolveTrailer } from "@/services/trailerResolver";
import { useAppStore } from "@/store/useAppStore";

/**
 * Lazy trailer hook - only fetches when explicitly triggered (on hover)
 * This prevents 100+ network requests on page load
 */
export const useTrailer = (movie: any, shouldFetch: boolean = false) => {
  const [loading, setLoading] = useState(false);

  const cached = useAppStore((s) => s.getTrailer(movie?.id));
  const setCache = useAppStore((s) => s.setTrailer);

  useEffect(() => {
    // 1️⃣ Do NOT fetch until shouldFetch is true (hover triggered)
    if (!shouldFetch) return;
    
    // 2️⃣ Do NOT fetch for invalid IDs
    if (!movie?.id || movie.id === 0) return;

    // 3️⃣ If cached, skip fetch
    if (cached !== undefined) return;

    setLoading(true);

    resolveTrailer(movie)
      .then((id) => setCache(movie.id, id || null))
      .finally(() => setLoading(false));
  }, [movie?.id, shouldFetch, cached, setCache]);

  return {
    trailer: cached ?? null,
    loading,
  };
};

/**
 * Eager trailer hook - for Banner component where we always want to fetch
 */
export const useTrailerEager = (movie: any) => {
  const [loading, setLoading] = useState(false);

  const cached = useAppStore((s) => s.getTrailer(movie?.id));
  const setCache = useAppStore((s) => s.setTrailer);

  useEffect(() => {
    // Do NOT fetch for invalid IDs
    if (!movie?.id || movie.id === 0) return;

    // If cached, skip fetch
    if (cached !== undefined) return;

    setLoading(true);

    resolveTrailer(movie)
      .then((id) => setCache(movie.id, id || null))
      .finally(() => setLoading(false));
  }, [movie?.id, cached, setCache]);

  return {
    trailer: cached ?? null,
    loading,
  };
};
