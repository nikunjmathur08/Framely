import React, { useState, useRef, useEffect, useMemo, useCallback, memo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Plus,
  Check,
  ChevronDown,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Movie } from "../types";
import { getImageUrl, TMDB_GENRES } from "../services/tmdb";
import { useAppStore } from "../store/useAppStore";
import { useNavigate } from "react-router-dom";
import { useTrailer } from "../hooks/useTrailer";

// Lazy load YouTube component - it's heavy and only needed on hover
const YouTube = lazy(() => import("react-youtube"));

interface Props {
  movie: Movie;
  isLargeRow?: boolean;
  index?: number;
  total?: number;
  isGrid?: boolean;
}

// Static animation configs - defined OUTSIDE component to prevent re-creation
const INITIAL_SCALE = { scale: 1, y: 0 };
const INITIAL_OPACITY = { opacity: 0 };
const ANIMATE_OPACITY_VISIBLE = { opacity: 1 };
const EXIT_OPACITY = { opacity: 0 };
const FADE_TRANSITION = { duration: 0.4 };
const QUICK_FADE = { duration: 0.2 };

const YOUTUBE_OPTS = {
  height: "100%",
  width: "100%",
  playerVars: {
    autoplay: 1,
    controls: 0,
    modestbranding: 1,
    mute: 1,
    loop: 1,
    rel: 0,
    showinfo: 0,
    iv_load_policy: 3,
    fs: 0,
  },
} as const;

// Static hover animation - defined once
const DESKTOP_HOVER = {
  scale: 1.4,
  y: -50,
  transition: {
    delay: 0.4,
    duration: 0.3,
    type: "tween" as const,
    ease: "easeInOut" as const,
  },
};
const NO_HOVER = {};

// Static style object
const MOTION_DIV_STYLE = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
};

const MovieCard: React.FC<Props> = memo(({
  movie,
  isLargeRow = false,
  index = 0,
  total = 0,
  isGrid = false,
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [player, setPlayer] = useState<any>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const hoverTimeout = useRef<any>(null);
  const youtubeDelayRef = useRef<any>(null);
  const navigate = useNavigate();
  
  // Individual stable selectors - these return stable references (functions/primitives)
  const addToList = useAppStore((state) => state.addToList);
  const removeFromList = useAppStore((state) => state.removeFromList);
  const myList = useAppStore((state) => state.myList);
  const hoveredMovieId = useAppStore((state) => state.hoveredMovieId);
  const setHoveredMovie = useAppStore((state) => state.setHoveredMovie);
  const openMoreInfo = useAppStore((state) => state.openMoreInfo);
  
  // Compute derived state locally
  const added = useMemo(() => myList.some((m) => m.id === movie.id), [myList, movie.id]);
  const isHovered = hoveredMovieId === movie.id;
  
  // LAZY: Only fetch trailer when card is hovered
  const { trailer } = useTrailer(movie, isHovered);
  
  // Detect desktop for hover behavior - compute once
  const [isDesktop] = useState(() => 
    typeof window !== 'undefined' && window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );

  // Delay YouTube iframe loading to prevent jank
  useEffect(() => {
    if (isHovered && trailer) {
      youtubeDelayRef.current = setTimeout(() => setShowYouTube(true), 100);
    } else {
      clearTimeout(youtubeDelayRef.current);
      setShowYouTube(false);
    }
    return () => clearTimeout(youtubeDelayRef.current);
  }, [isHovered, trailer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(hoverTimeout.current);
      clearTimeout(youtubeDelayRef.current);
    };
  }, []);

  // Pre-computed values
  const mediaType = movie.media_type || (movie.name ? "tv" : "movie");
  const originClass = index === 0 ? "origin-left" : 
                      (total > 0 && index === total - 1) ? "origin-right" : "origin-center";
  const displayTitle = movie.title || movie.name || movie.original_name;
  
  // Memoized values
  const imageSrc = useMemo(() => 
    getImageUrl(isLargeRow ? movie.poster_path : movie.backdrop_path || movie.poster_path, "w500"),
    [isLargeRow, movie.poster_path, movie.backdrop_path]
  );

  const logoPath = useMemo(() => 
    movie.images?.logos?.find((img: any) => img.iso_639_1 === "en")?.file_path || 
    movie.images?.logos?.[0]?.file_path,
    [movie.images?.logos]
  );

  const genreNames = useMemo(() => {
    if (!movie.genre_ids) return [];
    return movie.genre_ids.slice(0, 3).map((id) => TMDB_GENRES[id]).filter(Boolean);
  }, [movie.genre_ids]);

  const imageAnimateStyle = useMemo(() => ({ opacity: isImageLoaded ? 1 : 0 }), [isImageLoaded]);

  // Callbacks
  const handlePlay = useCallback(() => {
    navigate(`/watch/${mediaType}/${movie.id}`);
  }, [navigate, mediaType, movie.id]);

  const handleListToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    added ? removeFromList(movie.id) : addToList(movie);
  }, [added, addToList, removeFromList, movie]);

  const toggleMute = useCallback(() => {
    if (player) {
      isMuted ? player.unMute() : player.mute();
      setIsMuted(!isMuted);
    }
  }, [player, isMuted]);

  const onPlayerReady = useCallback((event: any) => setPlayer(event.target), []);
  const onImageLoad = useCallback(() => setIsImageLoaded(true), []);

  const handleMouseEnter = useCallback(() => {
    if (isDesktop) {
      hoverTimeout.current = setTimeout(() => setHoveredMovie(movie.id), 400);
    }
  }, [isDesktop, setHoveredMovie, movie.id]);

  const handleMouseLeave = useCallback(() => {
    if (isDesktop) {
      clearTimeout(hoverTimeout.current);
      setHoveredMovie(null);
    }
  }, [isDesktop, setHoveredMovie]);

  const handleCardClick = useCallback(() => {
    if (!isDesktop) openMoreInfo(movie);
  }, [isDesktop, openMoreInfo, movie]);

  const handleMoreInfoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    openMoreInfo(movie);
  }, [openMoreInfo, movie]);

  const handleMuteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMute();
  }, [toggleMute]);

  const formatDuration = (runtime: number) => `${Math.floor(runtime / 60)}h ${runtime % 60}`;

  const whileHoverAnimation = isDesktop ? DESKTOP_HOVER : NO_HOVER;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View details for ${displayTitle}`}
      className={`relative cursor-pointer pointer-events-auto ${
        isGrid ? "w-full h-full aspect-video" : `flex-none px-0.5 ${
          isLargeRow ? "w-[140px] sm:w-[180px] h-[210px] sm:h-[270px]"
                     : "w-[140px] sm:w-[180px] md:w-[260px] h-[90px] sm:h-[115px] md:h-[160px]"
        }`
      }`}
      style={{ zIndex: isHovered ? 999 : 10 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <motion.div
        className={`relative bg-[#181818] rounded-md shadow-2xl ${originClass}`}
        initial={INITIAL_SCALE}
        whileHover={whileHoverAnimation}
        style={MOTION_DIV_STYLE}
      >
        <div className={`relative w-full h-full rounded-md overflow-hidden ${isHovered ? "rounded-b-none shadow-md" : ""}`}>
          <div className="w-full h-full relative">
            {showYouTube && trailer ? (
              <div className="w-full h-full absolute inset-0 bg-black">
                <Suspense fallback={<div className="w-full h-full bg-black" />}>
                  <YouTube
                    videoId={trailer}
                    opts={YOUTUBE_OPTS}
                    onReady={onPlayerReady}
                    className="w-full h-full scale-[1.35]"
                    iframeClassName="w-full h-full"
                    onEnd={(e: any) => e.target.playVideo()}
                  />
                </Suspense>
                <div className="absolute inset-0 z-40 cursor-pointer" onClick={handlePlay} />
                <button
                  onClick={handleMuteClick}
                  className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 z-50 p-1 sm:p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/30"
                >
                  {isMuted ? <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                </button>
              </div>
            ) : (
              <>
                {!isImageLoaded && <div className="absolute inset-0 bg-[#2a2a2a] animate-pulse rounded-md" />}
                <motion.img
                  initial={INITIAL_OPACITY}
                  animate={imageAnimateStyle}
                  transition={FADE_TRANSITION}
                  onLoad={onImageLoad}
                  src={imageSrc}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </>
            )}
          </div>

          {(!isHovered || !trailer) && (
            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end justify-center h-1/2">
              {logoPath ? (
                <img src={getImageUrl(logoPath, "w500")} alt="Logo" className="w-3/4 max-h-14 object-contain mb-1 drop-shadow-lg" />
              ) : (
                <span className="text-white font-extrabold text-sm md:text-base text-center drop-shadow-lg leading-tight mb-1 px-2 line-clamp-2">
                  {displayTitle}
                </span>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={INITIAL_OPACITY}
              animate={ANIMATE_OPACITY_VISIBLE}
              exit={EXIT_OPACITY}
              transition={QUICK_FADE}
              className="p-3 bg-[#181818] rounded-b-md absolute top-full left-0 w-full shadow-[0px_10px_20px_rgba(0,0,0,0.7)] z-50 flex flex-col gap-3"
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <button onClick={handlePlay} className="bg-white hover:bg-neutral-200 transition text-black rounded-full p-1 sm:p-1.5 shadow-md flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8">
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-black translate-x-0.5" />
                </button>
                <button onClick={handleListToggle} className="border-2 border-gray-500 text-gray-300 hover:border-white hover:text-white transition rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-[#2a2a2a]/60" title="Add to My List">
                  {added ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Plus className="w-3 h-3 sm:w-4 sm:h-4" />}
                </button>
                <button className="border-2 border-gray-500 text-gray-300 hover:border-white hover:text-white transition rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-[#2a2a2a]/60" title="Like">
                  <ThumbsUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
                <button onClick={handleMoreInfoClick} className="border-2 border-gray-500 text-gray-300 hover:border-white hover:text-white transition rounded-full w-6 h-6 sm:w-8 sm:h-8 ml-auto flex items-center justify-center bg-[#2a2a2a]/60" title="More Info">
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] font-semibold flex-wrap">
                <span className="text-[#46d369]">{(movie.vote_average * 10).toFixed(0)}% Match</span>
                <span className="text-gray-400 border border-gray-500 px-1 rounded-[2px] text-[9px]">HD</span>
                <span className="text-gray-400">
                  {movie.runtime ? formatDuration(movie.runtime) : movie.number_of_seasons ? `${movie.number_of_seasons} Season${movie.number_of_seasons > 1 ? "s" : ""}` : mediaType === "movie" ? "1h 50m" : "1 Season"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-white">
                <span className="text-gray-300 line-clamp-1">{genreNames.length > 0 ? genreNames.join(" • ") : "Exciting • Drama • Sci-Fi"}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

MovieCard.displayName = 'MovieCard';

export default MovieCard;
