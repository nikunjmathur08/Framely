/**
 * Shared TMDB Backend Utilities
 *
 * This module provides common utilities for fetching data from the TMDB API,
 * used by both the Express local dev server (server/server.ts) and Vercel
 * serverless functions (api/*.ts).
 *
 * Goal: DRY (Don't Repeat Yourself) - centralize retry logic and request patterns.
 */
import axios, { type AxiosInstance } from 'axios';
import https from 'https';

// Create a reusable HTTPS agent optimized for TMDB
export const createTmdbAgent = (): https.Agent =>
  new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 3000,
    maxSockets: 50,
    maxFreeSockets: 10,
    family: 4,
    timeout: 30000,
  });

// Shared retry logic with exponential backoff
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; logger?: (msg: string) => void } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, logger = console.log } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: unknown) {
      lastError = error as Error;
      const axiosError = error as { code?: string; response?: unknown; message?: string };

      const isNetworkError =
        axiosError.code === 'ECONNABORTED' ||
        axiosError.code === 'ETIMEDOUT' ||
        axiosError.code === 'ENOTFOUND' ||
        axiosError.message?.includes('timeout') ||
        !axiosError.response;

      if (attempt === maxRetries || !isNetworkError) {
        throw lastError;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      logger(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Create a configured axios instance for TMDB
export function createTmdbClient(token: string): AxiosInstance {
  return axios.create({
    baseURL: 'https://api.themoviedb.org/3',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=utf-8',
    },
    httpsAgent: createTmdbAgent(),
    timeout: 20000,
  });
}

// Common genre endpoint mapping
export const GENRE_ENDPOINTS = {
  tv: {
    trending: '/trending/tv/week?language=en-US',
    topRated: '/tv/top_rated?language=en-US',
    action: '/discover/tv?with_genres=10759',
    comedy: '/discover/tv?with_genres=35',
    crime: '/discover/tv?with_genres=80',
    drama: '/discover/tv?with_genres=18',
    sciFiFantasy: '/discover/tv?with_genres=10765',
  },
  movie: {
    trending: '/trending/movie/week?language=en-US',
    topRated: '/movie/top_rated?language=en-US',
    action: '/discover/movie?with_genres=28',
    comedy: '/discover/movie?with_genres=35',
    horror: '/discover/movie?with_genres=27',
    romance: '/discover/movie?with_genres=10749',
    documentary: '/discover/movie?with_genres=99',
  },
} as const;

// Type definitions for API responses
export interface TMDBListItem {
  id: number;
  media_type?: 'movie' | 'tv';
  title?: string;
  name?: string;
  first_air_date?: string;
  release_date?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  overview?: string;
  vote_average?: number;
  genre_ids?: number[];
}

export interface TMDBListResponse {
  results: TMDBListItem[];
  page: number;
  total_pages: number;
  total_results: number;
}

export interface TMDBDetails extends TMDBListItem {
  runtime?: number;
  number_of_seasons?: number;
  images?: {
    logos?: Array<{ file_path: string; iso_639_1: string }>;
    backdrops?: Array<{ file_path: string }>;
    posters?: Array<{ file_path: string }>;
  };
  videos?: {
    results: Array<{ key: string; type: string; site: string }>;
  };
  credits?: {
    cast: Array<{ name: string; character: string }>;
    crew: Array<{ name: string; job: string }>;
  };
}
