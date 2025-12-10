import React, { useRef, useState } from 'react';
import { RowProps } from '../types';
import MovieCard from './MovieCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Skeleton from './Skeleton';

const Row: React.FC<RowProps> = ({ title, movies, loading, isLargeRow = false }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isMoved, setIsMoved] = useState(false);

  const handleClick = (direction: 'left' | 'right') => {
    setIsMoved(true);
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth 
        : scrollLeft + clientWidth;
      
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="h-fit space-y-0.5 md:space-y-1 px-4 md:px-10 mb-8 md:mb-12 -mt-16 md:-mt-20 first:mt-0 group relative group-hover:z-50">
      <h2 className="w-56 cursor-pointer text-sm font-semibold text-[#e5e5e5] transition duration-200 hover:text-white md:text-2xl mb-2">
        {title}
      </h2>
      
      <div className="relative -ml-2 md:-ml-4">
        <ChevronLeft
          className={`absolute top-0 bottom-0 left-2 z-40 m-auto h-9 w-9 cursor-pointer opacity-0 transition hover:scale-125 group-hover:opacity-100 ${!isMoved && 'hidden'}`}
          onClick={() => handleClick('left')}
        />
        <div
          ref={rowRef}
          className="flex items-center space-x-0.5 overflow-x-scroll scrollbar-hide md:space-x-1 px-2 md:px-4 pointer-events-none"
          style={{ scrollBehavior: 'smooth', overflowY: 'visible', paddingTop: '120px', paddingBottom: '180px', marginTop: '-120px', marginBottom: '-180px' }}
        >
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="pointer-events-auto">
                    <Skeleton className={`min-w-[180px] md:min-w-[260px] ${isLargeRow ? 'h-[280px]' : 'h-[160px]'}`} />
                </div>
              ))
            : movies.map((movie, index) => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  isLargeRow={isLargeRow} 
                  index={index}
                  total={movies.length}
                />
              ))}
        </div>

        <ChevronRight
          className="absolute top-0 bottom-0 right-2 z-40 m-auto h-9 w-9 cursor-pointer opacity-0 transition hover:scale-125 group-hover:opacity-100"
          onClick={() => handleClick('right')}
        />
      </div>
    </div>
  );
};

export default Row;