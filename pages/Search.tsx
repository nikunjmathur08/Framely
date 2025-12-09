import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios, { requests } from '../services/tmdb';
import { Movie } from '../types';
import MovieCard from '../components/MovieCard';
import Skeleton from '../components/Skeleton';

const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

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
          console.error(err);
          setLoading(false);
        });
    }
  }, [query]);

  return (
    <div className="min-h-screen bg-[#141414] pt-24 px-4 md:px-10">
      <Navbar />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-y-8 gap-x-4 pb-10">
          {results.map((movie) => (
            <div key={movie.id} className="transform hover:scale-105 transition duration-200">
               <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-center mt-20">
            <p>No results found for "{query}".</p>
        </div>
      )}
    </div>
  );
};

export default Search;
