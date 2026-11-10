import axios from 'axios';
import { Movie } from '../types';

export interface AnimeCatalog {
  trending: Movie[];
  topRated: Movie[];
  movies: Movie[];
}

const EMPTY_CATALOG: AnimeCatalog = { trending: [], topRated: [], movies: [] };
const NXSHA_ANIME_URL = 'https://nxsha.space/anime';

const catalogKeyForHeading = (heading: string): keyof AnimeCatalog | null => {
  const normalizedHeading = heading.toLowerCase();
  if (normalizedHeading.includes('trending anime')) return 'trending';
  if (normalizedHeading.includes('top rated anime')) return 'topRated';
  if (normalizedHeading.includes('anime movies')) return 'movies';
  return null;
};

const parseMovie = (card: Element): Movie | null => {
  const match = card.getAttribute('href')?.match(/^\/(movie|tv)\/(\d+)/);
  const image = card.querySelector('img');
  if (!match || !image) return null;

  const mediaType = match[1] as 'movie' | 'tv';
  const id = Number(match[2]);
  const title = image.getAttribute('alt')?.trim();
  const poster = image.getAttribute('src');
  if (!id || !title || !poster) return null;

  const ratingText = card.querySelector('div.absolute.right-2.top-2')?.textContent?.trim() || '';
  const date = card.querySelector('p.mt-1.text-xs.text-gray-400')?.textContent?.trim();

  return {
    id,
    ...(mediaType === 'movie' ? { title } : { name: title }),
    media_type: mediaType,
    poster_path: poster,
    backdrop_path: poster,
    overview: '',
    vote_average: Number(ratingText) || 0,
    genre_ids: [16],
    ...(mediaType === 'movie' ? { release_date: date } : { first_air_date: date }),
  };
};

export const parseAnimeCatalog = (html: string): AnimeCatalog => {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const catalog: AnimeCatalog = { ...EMPTY_CATALOG };

  document.querySelectorAll('section').forEach((section) => {
    const heading = section.querySelector('h2')?.textContent || '';
    const key = catalogKeyForHeading(heading);
    if (!key) return;

    catalog[key] = Array.from(section.querySelectorAll('a.group.flex-shrink-0.cursor-pointer[href]'))
      .map(parseMovie)
      .filter((movie): movie is Movie => movie !== null);
  });

  return catalog;
};

export const fetchAnimeCatalog = async (): Promise<AnimeCatalog> => {
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');
  const proxyUrl = `${backendUrl}/api/proxy?url=${encodeURIComponent(NXSHA_ANIME_URL)}`;
  const response = await axios.get<string>(proxyUrl, { responseType: 'text' });
  return parseAnimeCatalog(response.data);
};
