import React from 'react';
import { getImageUrl } from '../services/tmdb';
import { BannerProps } from '../types';
import { Info, Play, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useTrailer } from '../hooks/useTrailer';

const Banner: React.FC<BannerProps> = ({ movie, loading }) => {
  const navigate = useNavigate();
  const { openMoreInfo, setPlayingTrailer } = useAppStore();
  const { trailer } = useTrailer(movie || { id: 0 });

  const truncate = (str: string | undefined, n: number) => {
    return str && str.length > n ? str.substr(0, n - 1) + "..." : str;
  };

  const handlePlay = () => {
    if (movie) {
        const type = movie.media_type === 'tv' || movie.name ? 'tv' : 'movie';
        navigate(`/watch/${type}/${movie.id}`);
    }
  };

  const handlePlayTrailer = () => {
    if (trailer && movie) {
      setPlayingTrailer(trailer, movie);
      window.location.hash = `play=${trailer}`;
    }
  };

  const handleMoreInfo = () => {
    if (movie) {
      openMoreInfo(movie);
    }
  };

  if (loading || !movie) {
    return <div className="h-[70vh] bg-[#141414] animate-pulse" />;
  }

  return (
    <header
      className="relative h-[70vh] md:h-[85vh] object-cover"
      style={{
        backgroundImage: `url("${getImageUrl(movie.backdrop_path, 'original')}")`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative flex flex-col justify-end h-full px-4 pb-24 space-y-4 md:px-10 lg:w-[60%] xl:w-[50%] z-10">
        <h1 className="text-3xl font-bold md:text-5xl lg:text-7xl text-white drop-shadow-lg">
          {movie.title || movie.name || movie.original_name}
        </h1>
        
        <p className="max-w-xs text-xs text-shadow-md text-white md:max-w-lg md:text-lg lg:max-w-2xl font-medium drop-shadow-md">
          {truncate(movie.overview, 150)}
        </p>

        <div className="flex space-x-3">
          <button 
            onClick={handlePlay}
            className="flex items-center gap-x-2 rounded px-5 py-2 text-sm font-semibold transition hover:opacity-75 md:px-8 md:py-2.5 bg-white text-black"
          >
            <Play className="h-5 w-5 fill-black" />
            Play
          </button>
          {trailer && (
            <button 
              onClick={handlePlayTrailer}
              className="flex items-center gap-x-2 rounded px-5 py-2 text-sm font-semibold transition hover:opacity-75 md:px-8 md:py-2.5 bg-white/30 text-white backdrop-blur-sm hover:bg-white/40"
            >
              <PlayCircle className="h-5 w-5" />
              Watch Trailer
            </button>
          )}
          <button 
            onClick={handleMoreInfo}
            className="flex items-center gap-x-2 rounded px-5 py-2 text-sm font-semibold transition hover:opacity-75 md:px-8 md:py-2.5 bg-[gray]/70 text-white"
          >
            <Info className="h-5 w-5" />
            More Info
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-[#141414] to-transparent pointer-events-none" />
    </header>
  );
};

export default Banner;
