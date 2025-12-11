import { useState, useEffect } from "react";
import tmdb from "../services/tmdb";
import { Episode } from "../types";

interface SeasonData {
  episodes: Episode[];
}

export const useTvSeasonData = (
  seriesId: number | null,
  seasonNumber: number
) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seriesId || seasonNumber < 1) {
      setEpisodes([]);
      return;
    }

    const fetchSeasonData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await tmdb.get<SeasonData>(
          `/tv/${seriesId}/season/${seasonNumber}`
        );

        setEpisodes(response.data.episodes || []);
      } catch (err) {
        console.error("Error fetching season data:", err);
        setError("Failed to load episodes");
        setEpisodes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasonData();
  }, [seriesId, seasonNumber]);

  return { episodes, loading, error };
};
