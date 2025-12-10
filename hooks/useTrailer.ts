import { useEffect, useState } from "react";
import { resolveTrailer } from "@/services/trailerResolver";
import { useAppStore } from "@/store/useAppStore";

export const useTrailer = (movie: any) => {
  const [loading, setLoading] = useState(false);

  const cached = useAppStore((s) => s.getTrailer(movie?.id));
  const setCache = useAppStore((s) => s.setTrailer);

  useEffect(() => {
    // 1️⃣ Do NOT fetch for invalid IDs
    if (!movie?.id || movie.id === 0) return;

    // 2️⃣ If cached, skip fetch
    if (cached !== undefined) return;

    setLoading(true);

    resolveTrailer(movie)
      .then((id) => setCache(movie.id, id || null))
      .finally(() => setLoading(false));
  }, [movie?.id]);

  return {
    trailer: cached ?? null,
    loading,
  };
};
