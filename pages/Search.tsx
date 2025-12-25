import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios, { requests } from '../services/tmdb';
import { Movie } from '../types';
import MovieCard from '../components/MovieCard';
import Skeleton from '../components/Skeleton';
import { useSeo } from '../hooks/useSeo';
import { logger } from '../utils/logger';

const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  // SEO for Search page
  useSeo({
    title: query ? `Search: ${query}` : 'Search',
    description: query 
      ? `Search results for "${query}" on Framely. Find movies and TV shows matching your search.`
      : 'Search for movies and TV shows on Framely. Find your favorite content to stream.',
    type: 'website',
  });

  useEffect(() => {
    if (query) {
      setLoading(true);
      axios.get(`${requests.search}&query=${query}`)
        .then(res => {
          // Filter out people, only show movies/tv
          const filtered = res.data.results.filter(
            (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
          );
          setResults(filtered);
          setLoading(false);
        })
        .catch(err => {
          logger.error(err);
          setLoading(false);
        });
    }
  }, [query]);

  return (
    <div className="relative h-screen w-full bg-[#141414] pt-24 overflow-x-hidden">
      <Navbar />
      <div className="px-4 md:px-10">
        <h2 className="text-white text-2xl font-semibold mb-6">
          Search Results for: <span className="text-gray-400">{query}</span>
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-[200px]" />
              ))}
          </div>
        ) : results.length > 0 ? (

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-8 gap-x-4 pb-10">
            {results.map((movie) => (
              <MovieCard key={movie.id} movie={movie} isGrid />
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center mt-20">
              <p>No results found for "{query}".</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
