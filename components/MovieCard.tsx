import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Check, ChevronDown, ThumbsUp } from 'lucide-react';
import { Movie } from '../types';
import axios, { getImageUrl, requests, TMDB_GENRES } from '../services/tmdb';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

interface Props {
  movie: Movie;
  isLargeRow?: boolean;
  index?: number;
  total?: number;
}

const MovieCard: React.FC<Props> = ({ movie, isLargeRow = false, index = 0, total = 0 }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { addToList, removeFromList, isInList } = useAppStore();
  const added = isInList(movie.id);

  // Determine media type if not explicit
  const mediaType = movie.media_type || (movie.name ? 'tv' : 'movie');

  // Determine Transform Origin based on position in row
  const isFirst = index === 0;
  const isLast = total > 0 && index === total - 1;
  const originClass = isFirst ? 'origin-left' : isLast ? 'origin-right' : 'origin-center';

  const handlePlay = () => {
    navigate(`/watch/${mediaType}/${movie.id}`);
  };

  const handleListToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (added) {
      removeFromList(movie.id);
    } else {
      addToList(movie);
    }
  };

  const formatDuration = (runtime: number) => {
    const h = Math.floor(runtime / 60);
    const m = runtime % 60;
    return `${h}h ${m}m`;
  };

  const getGenreNames = () => {
    if (!movie.genre_ids) return [];
    return movie.genre_ids.slice(0, 3).map(id => TMDB_GENRES[id]).filter(Boolean);
  };

  // Logic to find the best logo (English preferred)
  // Use hydrated movie data from backend aggregation
  const logoPath = movie.images?.logos?.find((img: any) => img.iso_639_1 === 'en')?.file_path 
                 || movie.images?.logos?.[0]?.file_path;

  const displayTitle = movie.title || movie.name || movie.original_name;

  return (
    <div
      className={`relative flex-none cursor-pointer px-0.5 pointer-events-auto ${isLargeRow ? 'w-[200px] h-[300px]' : 'w-[260px] h-[160px]'}`}
      style={{ zIndex: isHovered ? 999 : 10 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className={`relative bg-[#181818] rounded-md shadow-2xl ${originClass}`}
        initial={{ scale: 1, y: 0 }}
        whileHover={{ 
            scale: 1.4, 
            y: -50, 
            transition: { delay: 0.4, duration: 0.3, type: "tween", ease: "easeInOut" } 
        }}
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%', 
        }}
      >
        <div className={`relative w-full h-full rounded-md overflow-auto ${isHovered ? 'rounded-b-none shadow-md' : ''}`}>
           <img
            src={getImageUrl(isLargeRow ? movie.poster_path : movie.backdrop_path || movie.poster_path, 'w500')}
            alt={displayTitle}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {/* Logo or Title Overlay - ALWAYS VISIBLE */}
           <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end justify-center h-1/2">
             {logoPath ? (
               <img 
                  src={getImageUrl(logoPath, 'w500')} 
                  alt="Logo" 
                  className="w-3/4 max-h-14 object-contain mb-1 drop-shadow-lg"
               />
             ) : (
               <span className="text-white font-extrabold text-sm md:text-base text-center drop-shadow-lg leading-tight mb-1 px-2 line-clamp-2">
                 {displayTitle}
               </span>
             )}
           </div>
        </div>

        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="p-3 bg-[#181818] rounded-b-md absolute top-full left-0 w-full shadow-[0px_10px_20px_rgba(0,0,0,0.7)] z-50 flex flex-col gap-3"
            >
              {/* Action Buttons Row */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePlay}
                  className="bg-white hover:bg-neutral-200 transition text-black rounded-full p-1 shadow-md flex items-center justify-center w-8 h-8"
                >
                  <Play className="w-4 h-4 fill-black translate-x-0.5" />
                </button>
                
                <button 
                  onClick={handleListToggle}
                  className="border-2 border-gray-500 text-gray-300 hover:border-white hover:text-white transition rounded-full w-8 h-8 flex items-center justify-center bg-[#2a2a2a]/60"
                  title="Add to My List"
                >
                  {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>

                <button 
                  className="border-2 border-gray-500 text-gray-300 hover:border-white hover:text-white transition rounded-full w-8 h-8 flex items-center justify-center bg-[#2a2a2a]/60"
                  title="Like"
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    useAppStore.getState().openMoreInfo(movie);
                  }}
                  className="border-2 border-gray-500 text-gray-300 hover:border-white hover:text-white transition rounded-full w-8 h-8 ml-auto flex items-center justify-center bg-[#2a2a2a]/60"
                  title="More Info"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Metadata Row */}
              <div className="flex items-center gap-2 text-[10px] font-semibold flex-wrap">
                  <span className="text-[#46d369]">
                    {(movie.vote_average * 10).toFixed(0)}% Match
                  </span>
                  <span className="text-gray-400 border border-gray-500 px-1 rounded-[2px] text-[9px]">HD</span>
                  <span className="text-gray-400">
                    {movie.runtime ? formatDuration(movie.runtime) : 
                     movie.number_of_seasons ? `${movie.number_of_seasons} Season${movie.number_of_seasons > 1 ? 's' : ''}` : 
                     mediaType === 'movie' ? '1h 50m' : '1 Season'}
                  </span>
              </div>
                 
              {/* Genres Row */}
              <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-white">
                 <span className="text-gray-300 line-clamp-1">
                     {getGenreNames().length > 0 
                        ? getGenreNames().join(' • ')
                        : "Exciting • Drama • Sci-Fi"}
                 </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default MovieCard;