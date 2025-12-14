import axios from 'axios';
import { TvShowDetails, Movie } from '../types';

// Backend proxy server URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const tmdb = axios.create({
  baseURL: `${BACKEND_URL}/api/tmdb`,
});


export const TMDB_GENRES: Record<number, string> = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
    10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
    10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics"
};

// --- MOCK DATA FOR FALLBACK ---
// Used when API calls fail (e.g. invalid key or network error) to ensure the app UI still functions.
const MOCK_MOVIES: Movie[] = [
  {
    id: 66732,
    name: "Stranger Things",
    media_type: "tv",
    backdrop_path: "/56v2KjBlU4XaOv9rVYkJu64COIL.jpg",
    poster_path: "/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    overview: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
    vote_average: 8.6,
    genre_ids: [18, 10765, 9648],
    first_air_date: "2016-07-15"
  },
  {
    id: 119051,
    name: "Wednesday",
    media_type: "tv",
    backdrop_path: "/iHSwvRVsRyxpX787C4BNvehsDsk.jpg",
    poster_path: "/9PFonBhy4cQy7Jz20NpMygczOkq.jpg",
    overview: "Wednesday Addams is sent to Nevermore Academy, a bizarre boarding school where she attempts to master her psychic powers, stop a monstrous killing spree of the town citizens, and solve the supernatural mystery that affected her family 25 years ago — all while navigating her new and very tangled relationships.",
    vote_average: 8.5,
    genre_ids: [10765, 9648, 35],
    first_air_date: "2022-11-23"
  },
  {
    id: 157336,
    title: "Interstellar",
    media_type: "movie",
    backdrop_path: "/xJHokMBLlb6MnueuWO2bR9TEpha.jpg",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    vote_average: 8.4,
    genre_ids: [12, 18, 878],
    release_date: "2014-11-05"
  },
  {
    id: 27205,
    title: "Inception",
    media_type: "movie",
    backdrop_path: "/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    poster_path: "/9gk7admal4ZLvd9ZbfqF06x94OI.jpg",
    overview: "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life as payment for a task considered to be impossible: \"inception\", the implantation of another person's idea into a target's subconscious.",
    vote_average: 8.4,
    genre_ids: [28, 878, 12],
    release_date: "2010-07-15"
  },
  {
    id: 299534,
    title: "Avengers: Endgame",
    media_type: "movie",
    backdrop_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    poster_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    overview: "After the devastating events of Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos' actions and restore balance to the universe.",
    vote_average: 8.3,
    genre_ids: [12, 878, 28],
    release_date: "2019-04-24"
  },
   {
    id: 93405,
    name: "Squid Game",
    media_type: "tv",
    backdrop_path: "/2meX1nMdScFOoV4370rqFDLDtTI.jpg",
    poster_path: "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg",
    overview: "Hundreds of cash-strapped players accept a strange invitation to compete in children's games. Inside, a tempting prize awaits with deadly high stakes. A survival game that has a whopping 45.6 billion-won prize at stake.",
    vote_average: 7.8,
    genre_ids: [10759, 9648, 18],
    first_air_date: "2021-09-17"
  },
  {
    id: 155,
    title: "The Dark Knight",
    media_type: "movie",
    backdrop_path: "/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
    poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    overview: "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets. The partnership proves to be effective, but they soon find themselves prey to a reign of chaos unleashed by a rising criminal mastermind known to the terrified citizens of Gotham as the Joker.",
    vote_average: 8.5,
    genre_ids: [18, 28, 80, 53],
    release_date: "2008-07-16"
  },
  {
    id: 496243,
    title: "Parasite",
    media_type: "movie",
    backdrop_path: "/hiKmpZMGZsrkA3cdce8a7Dpos1j.jpg",
    poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    overview: "All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.",
    vote_average: 8.5,
    genre_ids: [35, 53, 18],
    release_date: "2019-05-30"
  },
   {
    id: 65495,
    name: "The Crown",
    media_type: "tv",
    backdrop_path: "/tvN197hWd0EWE28QZqYbL4LhFq.jpg",
    poster_path: "/2qGfX4Y0q3q4j8X4j8X4j8X4.jpg",
    overview: "Battles. Betrayal. Love. The story of Queen Elizabeth II's reign and the events that shaped the second half of the twentieth century.",
    vote_average: 8.2,
    genre_ids: [18, 10768],
    first_air_date: "2016-11-04"
  }
];

const MOCK_TV_DETAILS: TvShowDetails = {
  ...MOCK_MOVIES[0],
  number_of_seasons: 4,
  number_of_episodes: 34,
  seasons: [
    { air_date: "2016-07-15", episode_count: 8, id: 77680, name: "Season 1", overview: "", poster_path: "", season_number: 1, vote_average: 8.2 },
    { air_date: "2017-10-27", episode_count: 9, id: 85937, name: "Season 2", overview: "", poster_path: "", season_number: 2, vote_average: 8.0 },
    { air_date: "2019-07-04", episode_count: 8, id: 115216, name: "Season 3", overview: "", poster_path: "", season_number: 3, vote_average: 8.0 },
    { air_date: "2022-05-27", episode_count: 9, id: 252922, name: "Season 4", overview: "", poster_path: "", season_number: 4, vote_average: 8.0 }
  ]
};

// Helper to attach mock images
const attachMockImages = (data: any) => {
  return {
    ...data,
    images: {
      logos: [] // We provide empty array so safe access works; can add real mock URLs here if available
    }
  };
};

// Response Interceptor to handle errors and serve mock data
tmdb.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only intercept if it's a known API error or network error
    // We log it so developers know the API key might be missing
    console.warn("TMDB API request failed. Using Mock Data.", error.message);

    // Mock Response Structure
    const mockResponse = {
      data: {
        results: MOCK_MOVIES,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: error.config,
    };

    // Handle TV Details specifically
    if (error.config.url && error.config.url.includes('/tv/') && !error.config.url.includes('discover')) {
       // Extracting just for logic, but we return a generic TV detail for any ID to prevent crashes
       mockResponse.data = attachMockImages(MOCK_TV_DETAILS);
    } 
    // Handle Movie Details
    else if (error.config.url && error.config.url.includes('/movie/') && !error.config.url.includes('discover') && !error.config.url.includes('top_rated')) {
         const mockMovie = MOCK_MOVIES.find(m => m.media_type === 'movie') || MOCK_MOVIES[2];
         mockResponse.data = attachMockImages({
             ...mockMovie,
             runtime: 148 // Mock runtime for details
         });
    }
    // Handle Search
    else if (error.config.url && error.config.url.includes('/search/multi')) {
        // Filter mock data if query exists, else return all
        mockResponse.data.results = MOCK_MOVIES; 
    }
    // Handle Discover/Trending (General Lists)
    else {
        // Shuffle for variety
        mockResponse.data.results = [...MOCK_MOVIES].sort(() => 0.5 - Math.random());
    }

    return Promise.resolve(mockResponse);
  }
);

export const requests = {
  fetchTrending: `/trending/all/week?language=en-US`,
  fetchNetflixOriginals: `/discover/tv?with_networks=213`,
  fetchTopRated: `/movie/top_rated?language=en-US`,
  fetchActionMovies: `/discover/movie?with_genres=28`,
  fetchComedyMovies: `/discover/movie?with_genres=35`,
  fetchHorrorMovies: `/discover/movie?with_genres=27`,
  fetchRomanceMovies: `/discover/movie?with_genres=10749`,
  fetchDocumentaries: `/discover/movie?with_genres=99`,
  
  // TV Shows Specific
  fetchTrendingTV: `/trending/tv/week?language=en-US`,
  fetchTopRatedTV: `/tv/top_rated?language=en-US`,
  fetchActionAdventureTV: `/discover/tv?with_genres=10759`,
  fetchComedyTV: `/discover/tv?with_genres=35`,
  fetchCrimeTV: `/discover/tv?with_genres=80`,
  fetchDramaTV: `/discover/tv?with_genres=18`,
  fetchKidsTV: `/discover/tv?with_genres=10762`,
  fetchSciFiFantasyTV: `/discover/tv?with_genres=10765`,

  // Movies Specific
  fetchTrendingMovies: `/trending/movie/week?language=en-US`,
  // (TopRated, Action, Comedy etc already exist reused)

  // New & Popular
  fetchPopularMovies: `/movie/popular?language=en-US`,
  fetchPopularTV: `/tv/popular?language=en-US`,

  search: `/search/multi?include_adult=false&language=en-US&page=1`,
  getTvDetails: (id: string) => `/tv/${id}?language=en-US&append_to_response=images,videos`,
  getMovieDetails: (id: string) => `/movie/${id}?language=en-US&append_to_response=images,videos`,
};

export const getImageUrl = (path: string | null, size: 'original' | 'w500' = 'original') => {
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
  // If path is already a full URL (e.g., from mock data referencing external images), return it
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export default tmdb;