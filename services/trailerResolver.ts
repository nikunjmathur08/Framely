import axios from "axios";

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const YT_API_KEY = import.meta.env.VITE_YT_API_KEY;

console.log("[TrailerResolver] API Keys configured:", {
  TMDB: !!TMDB_API_KEY,
  YT: !!YT_API_KEY,
});

const pickBest = (videos: any[]) => {
  if (!videos?.length) {
    console.log("[TrailerResolver] No videos found in results");
    return null;
  }

  console.log(`[TrailerResolver] Picking best from ${videos.length} videos`);

  const priority = ["Trailer", "Teaser", "Clip"];

  for (const type of priority) {
    const match = videos.find((v) => v.type === type && v.site === "YouTube");
    if (match) {
      console.log(`[TrailerResolver] Found ${type}: ${match.key}`);
      return match.key;
    }
  }

  const any = videos.find((v) => v.site === "YouTube");
  if (any) {
    console.log(`[TrailerResolver] Found fallback video: ${any.key}`);
  }
  return any?.key || null;
};

// Direct lookup: /movie/:id/videos OR /tv/:id/videos
export const fetchTMDBDirect = async (movie: any) => {
  if (!TMDB_API_KEY) {
    console.error("[TrailerResolver] TMDB API key not configured!");
    return null;
  }

  const type = movie.media_type || (movie.name ? "tv" : "movie");
  console.log(
    `[TrailerResolver] fetchTMDBDirect - Type: ${type}, ID: ${
      movie.id
    }, Title: ${movie.title || movie.name}`
  );

  try {
    const url = `https://api.themoviedb.org/3/${type}/${movie.id}/videos`;
    console.log(`[TrailerResolver] Fetching: ${url}?api_key=***`);

    const { data } = await axios.get(url, {
      params: {
        api_key: TMDB_API_KEY,
        language: "en-US",
      },
    });

    console.log(`[TrailerResolver] TMDB Direct response:`, data);

    const result = pickBest(data.results);
    console.log(`[TrailerResolver] TMDB Direct result: ${result || "null"}`);
    return result;
  } catch (error: any) {
    console.error(
      "[TrailerResolver] TMDB Direct error:",
      error.response?.data || error.message
    );
    return null;
  }
};

// TMDB Search fallback → get canonical entry instead
export const fetchTMDBSearch = async (movie: any) => {
  if (!TMDB_API_KEY) {
    console.error("[TrailerResolver] TMDB API key not configured!");
    return null;
  }

  console.log(
    `[TrailerResolver] fetchTMDBSearch - Title: ${movie.title || movie.name}`
  );

  try {
    const title = movie.title || movie.name;
    if (!title) {
      console.log("[TrailerResolver] No title available for search");
      return null;
    }

    const searchUrl = `https://api.themoviedb.org/3/search/multi`;
    console.log(`[TrailerResolver] Searching: ${searchUrl}?query=${title}`);

    const search = await axios.get(searchUrl, {
      params: {
        api_key: TMDB_API_KEY,
        query: title,
        language: "en-US",
      },
    });

    console.log(
      `[TrailerResolver] Search results:`,
      search.data.results?.slice(0, 3)
    );

    if (!search.data.results?.length) {
      console.log("[TrailerResolver] No search results found");
      return null;
    }

    const best =
      search.data.results.find((r: any) => r.media_type === movie.media_type) ||
      search.data.results[0];

    console.log(`[TrailerResolver] Best match:`, best);

    const videosUrl = `https://api.themoviedb.org/3/${best.media_type}/${best.id}/videos`;
    const { data } = await axios.get(videosUrl, {
      params: {
        api_key: TMDB_API_KEY,
        language: "en-US",
      },
    });

    const result = pickBest(data.results);
    console.log(`[TrailerResolver] TMDB Search result: ${result || "null"}`);
    return result;
  } catch (error: any) {
    console.error(
      "[TrailerResolver] TMDB Search error:",
      error.response?.data || error.message
    );
    return null;
  }
};

// YouTube Fallback search

export const fetchYouTubeFallback = async (movie: any) => {
  if (!YT_API_KEY) {
    console.log("[TrailerResolver] YouTube API key not configured");
    return null;
  }

  const title = movie.title || movie.name;
  const year =
    movie.release_date?.slice(0, 4) || movie.first_air_date?.slice(0, 4) || "";

  const query = `${title} ${year} official trailer`;
  console.log(`[TrailerResolver] fetchYouTubeFallback - Query: ${query}`);

  try {
    const ytUrl = `https://www.googleapis.com/youtube/v3/search`;
    console.log(`[TrailerResolver] YouTube search initiated`);

    const { data } = await axios.get(ytUrl, {
      params: {
        part: "snippet",
        type: "video",
        maxResults: 1,
        q: query,
        key: YT_API_KEY,
      },
    });

    console.log(`[TrailerResolver] YouTube response:`, data);

    const result = data.items?.[0]?.id?.videoId || null;
    console.log(
      `[TrailerResolver] YouTube Fallback result: ${result || "null"}`
    );
    return result;
  } catch (error: any) {
    console.error(
      "[TrailerResolver] YouTube Fallback error:",
      error.response?.data || error.message
    );
    return null;
  }
};

export const resolveTrailer = async (movie: any) => {
  console.log(
    `\n[TrailerResolver] ========== Resolving trailer for: ${
      movie.title || movie.name
    } (ID: ${movie.id}) ==========`
  );

  let id = await fetchTMDBDirect(movie);
  if (id) {
    console.log(`[TrailerResolver] ✓ Resolved via TMDB Direct: ${id}\n`);
    return id;
  }

  id = await fetchTMDBSearch(movie);
  if (id) {
    console.log(`[TrailerResolver] ✓ Resolved via TMDB Search: ${id}\n`);
    return id;
  }

  id = await fetchYouTubeFallback(movie);
  if (id) {
    console.log(`[TrailerResolver] ✓ Resolved via YouTube: ${id}\n`);
  } else {
    console.log(`[TrailerResolver] ✗ No trailer found\n`);
  }

  return id || null;
};
