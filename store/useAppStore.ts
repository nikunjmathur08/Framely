import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Movie } from "../types";
import axios from "axios";
import { logger } from "../utils/logger";

export interface MovieData {
  trending: Movie[];
  topRated: Movie[];
  action: Movie[];
  comedy: Movie[];
  horror: Movie[];
  romance: Movie[];
  documentaries: Movie[];
  upcoming: Movie[];
  hindi: Movie[];
}

interface AppState {
  // My List functionality
  myList: Movie[];
  selectedMovie: Movie | null;
  addToList: (movie: Movie) => void;
  removeFromList: (movieId: number) => void;
  isInList: (movieId: number) => boolean;
  openMoreInfo: (movie: Movie) => void;
  closeMoreInfo: () => void;

  // Movie data caching
  movieData: MovieData;
  movieDataLoading: boolean;
  movieDataError: Error | null;
  lastFetched: number | null;
  fetchMovieData: (force?: boolean) => Promise<void>;

  // Trailer Cache
  trailerCache: Record<number, string | null>;
  getTrailer: (id: number) => string | null | undefined;
  setTrailer: (id: number, url: string | null) => void;

  // Trailer Playback State
  playingTrailer: { videoId: string; movie: Movie } | null;
  setPlayingTrailer: (videoId: string, movie: Movie) => void;
  clearPlayingTrailer: () => void;

  // Global Hover State - ensures only one card is hovered at a time
  hoveredMovieId: number | null;
  setHoveredMovie: (movieId: number | null) => void;
  clearHoveredMovie: () => void;

  // Banner Trailer State - for seamless handoff to MoreInfoModal
  bannerTrailerState: { 
    wasPlaying: boolean; 
    trailerId: string | null;
    playbackTime?: number;
    wasMuted?: boolean;
  } | null;
  setBannerTrailerState: (state: { 
    wasPlaying: boolean; 
    trailerId: string | null;
    playbackTime?: number;
    wasMuted?: boolean;
  } | null) => void;
  // Watch History State
  watchHistory: Record<string, { season?: number; episode?: number; lastWatched: number; timestamp?: number; duration?: number; mediaType?: 'movie' | 'tv' }>;
  updateWatchHistory: (id: number | string, data: { season?: number; episode?: number; timestamp?: number; duration?: number; mediaType?: 'movie' | 'tv' }) => void;
  getWatchHistory: (id: number | string) => { season?: number; episode?: number; lastWatched: number; timestamp?: number; duration?: number; mediaType?: 'movie' | 'tv' } | undefined;
  removeFromWatchHistory: (id: number | string) => void;

  // Ad Blocker Modal Preference
  hideAdBlockerModal: boolean;
  setHideAdBlockerModal: (hide: boolean) => void;

  // Player Selection
  preferredPlayer: string;
  setPreferredPlayer: (player: string) => void;
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

const emptyMovieData: MovieData = {
  trending: [],
  topRated: [],
  action: [],
  comedy: [],
  horror: [],
  romance: [],
  documentaries: [],
  upcoming: [],
  hindi: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // My List state
      myList: [],
      selectedMovie: null,

      // Movie data state
      movieData: emptyMovieData,
      movieDataLoading: false,
      movieDataError: null,
      lastFetched: null,

      // Trailer Cache - NOT persisted to avoid quota issues
      trailerCache: {} as Record<number, string | null>,
      getTrailer: (id: number) => get().trailerCache[id],
      setTrailer: (id: number, url: string | null) => {
        // Limit cache size to 100 entries to prevent memory bloat
        const cache = get().trailerCache;
        const keys = Object.keys(cache);
        if (keys.length > 100) {
          // Remove oldest 20 entries
          const toRemove = keys.slice(0, 20);
          const newCache = { ...cache };
          toRemove.forEach(k => delete newCache[Number(k)]);
          set({ trailerCache: { ...newCache, [id]: url } });
        } else {
          set({ trailerCache: { ...cache, [id]: url } });
        }
      },

      // Trailer Playback State
      playingTrailer: null,
      setPlayingTrailer: (videoId: string, movie: Movie) =>
        set({ playingTrailer: { videoId, movie } }),
      clearPlayingTrailer: () => set({ playingTrailer: null }),

      // Global Hover State
      hoveredMovieId: null,
      setHoveredMovie: (movieId: number | null) =>
        set({ hoveredMovieId: movieId }),
      clearHoveredMovie: () => set({ hoveredMovieId: null }),

      // Banner Trailer State
      bannerTrailerState: null,
      setBannerTrailerState: (state) => set({ bannerTrailerState: state }),

      // Watch History
      watchHistory: {},
      updateWatchHistory: (id, data) =>
        set((state) => ({
          watchHistory: {
            ...state.watchHistory,
            [id]: { ...state.watchHistory[id], ...data, lastWatched: Date.now() },
          },
        })),
      getWatchHistory: (id) => get().watchHistory[id],
      removeFromWatchHistory: (id) =>
        set((state) => {
          const newHistory = { ...state.watchHistory };
          delete newHistory[String(id)];
          return { watchHistory: newHistory };
        }),

      // Ad Blocker Modal Preference
      hideAdBlockerModal: false,
      setHideAdBlockerModal: (hide: boolean) => set({ hideAdBlockerModal: hide }),

      // Player Selection
      preferredPlayer: 'mappleuk',
      setPreferredPlayer: (player: string) => set({ preferredPlayer: player }),

      // My List actions
      addToList: (movie) => {
        const { myList } = get();
        if (!myList.find((m) => m.id === movie.id)) {
          set({ myList: [...myList, movie] });
        }
      },
      removeFromList: (movieId) => {
        set({ myList: get().myList.filter((m) => m.id !== movieId) });
      },
      isInList: (movieId) => {
        return !!get().myList.find((m) => m.id === movieId);
      },
      openMoreInfo: (movie) => {
        set({ selectedMovie: movie });
      },
      closeMoreInfo: () => {
        set({ selectedMovie: null });
      },

      // Movie data fetching with intelligent caching
      fetchMovieData: async (force = false) => {
        const { lastFetched, movieDataLoading, movieData } = get();
        const now = Date.now();

        // Check if cache is fresh (within TTL)
        const isCacheFresh = lastFetched && now - lastFetched < CACHE_TTL;

        // Skip fetch if cache is fresh and not forced
        if (!force && isCacheFresh) {
          logger.log("✓ Using cached movie data (fresh)");
          return;
        }

        // Skip if already loading
        if (movieDataLoading) {
          logger.log("⏳ Movie data fetch already in progress");
          return;
        }

        // If cache exists but is stale, show cached data while fetching
        const hasCache = movieData.trending.length > 0;
        if (hasCache && !isCacheFresh) {
          logger.log("🔄 Cache stale, refreshing in background...");
        }

        try {
          set({ movieDataLoading: true, movieDataError: null });

          const backendUrl =
            import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');
          const response = await axios.get(`${backendUrl}/api/movies/homepage`);

          // Defensive: Ensure response has the expected structure
          const responseData = response.data || {};
          const safeData: MovieData = {
            trending: Array.isArray(responseData.trending) ? responseData.trending : [],
            topRated: Array.isArray(responseData.topRated) ? responseData.topRated : [],
            action: Array.isArray(responseData.action) ? responseData.action : [],
            comedy: Array.isArray(responseData.comedy) ? responseData.comedy : [],
            horror: Array.isArray(responseData.horror) ? responseData.horror : [],
            romance: Array.isArray(responseData.romance) ? responseData.romance : [],
            documentaries: Array.isArray(responseData.documentaries) ? responseData.documentaries : [],
            upcoming: Array.isArray(responseData.upcoming) ? responseData.upcoming : [],
            hindi: Array.isArray(responseData.hindi) ? responseData.hindi : []
          };

          set({
            movieData: safeData,
            movieDataLoading: false,
            lastFetched: Date.now(),
            movieDataError: null,
          });

          logger.log("✅ Movie data fetched and cached successfully");
        } catch (err) {
          logger.error("❌ Error fetching movie data:", err);
          set({
            movieDataError:
              err instanceof Error
                ? err
                : new Error("Failed to fetch movie data"),
            movieDataLoading: false,
          });
        }
      },
    }),
    {
      name: "framley-storage",
      // Only persist essential user data, NOT large cached data
      partialize: (state) => ({
        myList: state.myList,
        watchHistory: state.watchHistory,
        hideAdBlockerModal: state.hideAdBlockerModal,
        preferredPlayer: state.preferredPlayer,
      }),
    }
  )
);
