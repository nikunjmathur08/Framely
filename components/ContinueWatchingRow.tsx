import React from 'react';
import { Link } from 'react-router-dom';
import { Play, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Movie } from '../types';
import { getImageUrl } from '../services/tmdb';
import { useAppStore } from '../store/useAppStore';

interface ContinueWatchingItem {
  id: string;
  movie: Movie;
  progress: number; // 0-100
  season?: number;
  episode?: number;
  lastWatched: number;
}

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
  onRemove: (id: string) => void;
}

/**
 * A specialized row for "Continue Watching" items with progress bars
 */
const ContinueWatchingRow: React.FC<ContinueWatchingRowProps> = ({ items, onRemove }) => {
  const rowRef = React.useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="h-fit px-2 sm:px-4 md:px-10 mb-6 sm:mb-8 relative pointer-events-none first:-mt-20 md:first:-mt-24"
      aria-labelledby="continue-watching-heading"
    >
      <h2 
        id="continue-watching-heading"
        className="text-sm font-semibold text-[#e5e5e5] sm:text-lg md:text-2xl mb-3 sm:mb-4 pointer-events-auto inline-block"
      >
        Continue Watching
      </h2>

      <div
        ref={rowRef}
        className="flex space-x-3 md:space-x-4 overflow-x-auto scrollbar-hide pb-4 pointer-events-auto"
      >
        {items.map((item, index) => (
          <ContinueWatchingCard
            key={item.id}
            item={item}
            onRemove={onRemove}
            index={index}
          />
        ))}
      </div>
    </motion.section>
  );
};

interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
  onRemove: (id: string) => void;
  index: number;
}

const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({ item, onRemove, index }) => {
  const { movie, progress, season, episode, id } = item;
  const mediaType = movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
  
  // Build the watch URL with season/episode for TV shows
  const watchUrl = mediaType === 'tv' 
    ? `/watch/tv/${movie.id}` 
    : `/watch/movie/${movie.id}`;

  const title = movie.title || movie.name || 'Unknown';

  // Format time remaining (rough estimate)
  const formatTimeRemaining = () => {
    if (!item.movie.runtime) return null;
    const remainingMinutes = Math.round((item.movie.runtime * (100 - progress)) / 100);
    if (remainingMinutes < 60) return `${remainingMinutes}m left`;
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    return `${hours}h ${mins}m left`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="relative flex-shrink-0 w-[280px] md:w-[320px] group"
    >
      {/* Card */}
      <Link to={watchUrl} className="block">
        <div className="relative aspect-video rounded-md overflow-hidden bg-gray-800">
          {/* Backdrop Image */}
          <img
            src={getImageUrl(movie.backdrop_path || movie.poster_path, 'w500')}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {/* Play button overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
              <Play className="w-6 h-6 text-black fill-black ml-1" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
            <div 
              className="h-full bg-framely-red transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Link>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(id);
        }}
        className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label="Remove from Continue Watching"
      >
        <X className="w-4 h-4 text-white" />
      </button>

      {/* Info */}
      <div className="mt-2 px-1">
        <h3 className="text-white font-medium text-sm line-clamp-1">{title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
          {mediaType === 'tv' && season && episode && (
            <span>S{season} E{episode}</span>
          )}
          {formatTimeRemaining() && (
            <span>{formatTimeRemaining()}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ContinueWatchingRow;
