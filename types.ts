export interface Movie {
  id: number;
  title?: string;
  name?: string; // For TV shows
  original_name?: string;
  backdrop_path: string | null;
  poster_path: string | null;
  overview: string;
  vote_average: number;
  genre_ids: number[];
  first_air_date?: string;
  release_date?: string;
  media_type?: "movie" | "tv";

  // Detail fields populated by backend aggregation
  images?: {
    logos?: Array<{ file_path: string; iso_639_1: string }>;
  };
  runtime?: number; // For movies
  number_of_seasons?: number; // For TV shows
  seasons?: Season[]; // For TV shows
  credits?: {
    cast?: Array<{ name: string; character: string; profile_path?: string }>;
    crew?: Array<{ name: string; job: string }>;
  };
  recommendations?: {
    results?: Movie[];
  };
}

export interface Genre {
  id: number;
  name: string;
}

export interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime: number;
  air_date: string;
}

export interface Season {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
  vote_average: number;
  episodes?: Episode[];
}

export interface TvShowDetails extends Movie {
  seasons: Season[];
  number_of_seasons: number;
  number_of_episodes: number;
}

export interface VideoProps {
  tmdbId: string;
  type: "movie" | "tv";
}

export interface RowProps {
  title: string;
  movies: Movie[];
  loading: boolean;
  isLargeRow?: boolean;
}

export interface BannerProps {
  movie: Movie | null;
  loading: boolean;
}
