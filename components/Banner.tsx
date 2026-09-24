import React, { useState, useEffect } from "react";
import { getImageUrl } from "../services/tmdb";
import { BannerProps } from "../types";
import { Info, Play, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { useTrailerEager } from "../hooks/useTrailer";
import { logger } from "../utils/logger";
import { deriveBannerTags } from "../utils/bannerTags";
import YouTube from "react-youtube";
import axios from "axios";

const Banner: React.FC<BannerProps> = ({ movie, loading }) => {
  const navigate = useNavigate();
  const { openMoreInfo, setBannerTrailerState } = useAppStore();
  const { trailer } = useTrailerEager(movie || { id: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [player, setPlayer] = useState<any>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);

  const mediaLabel = movie?.media_type === "tv" || movie?.first_air_date ? "Series" : "Movie";
  const releaseYear = movie?.release_date
    ? new Date(movie.release_date).getFullYear()
    : movie?.first_air_date
    ? new Date(movie.first_air_date).getFullYear()
    : null;
  
  const seasons = movie?.number_of_seasons ? `${movie.number_of_seasons} Season${movie.number_of_seasons > 1 ? "s" : ""}`
    : null;

  // Derive data-driven tags from TMDB keywords / vote data
  const bannerTags = deriveBannerTags(movie ?? null);

  // Sync logoPath from movie.images (fast path) or fetch on-demand (fallback)
  useEffect(() => {
    if (!movie) return;

    const logos = movie.images?.logos;
    if (logos && logos.length > 0) {
      const preferred = logos.find((l) => l.iso_639_1 === "en") || logos[0];
      setLogoPath(preferred.file_path);
      return;
    }

    // Fallback: fetch images on-demand via the generic TMDB proxy
    const fetchLogo = async () => {
      try {
        const backendUrl =
          import.meta.env.VITE_BACKEND_URL ||
          (import.meta.env.PROD ? "" : "http://localhost:3001");
        const mediaType =
          movie.media_type || (movie.first_air_date ? "tv" : "movie");
        const res = await axios.get(
          `${backendUrl}/api/tmdb/${mediaType}/${movie.id}?append_to_response=images`
        );
        const fetchedLogos = res.data?.images?.logos;
        if (fetchedLogos && fetchedLogos.length > 0) {
          const preferred =
            fetchedLogos.find((l: any) => l.iso_639_1 === "en") ||
            fetchedLogos[0];
          setLogoPath(preferred.file_path);
        } else {
          setLogoPath(null);
        }
      } catch (e) {
        logger.warn("Banner: failed to fetch logo for movie", movie.id, e);
        setLogoPath(null);
      }
    };

    fetchLogo();
  }, [movie]);

  // Auto-play trailer when it becomes available
  useEffect(() => {
    if (trailer && movie) {
      const timer = setTimeout(() => setIsPlaying(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [trailer, movie]);

  const onPlayerReady = (event: any) => {
    setPlayer(event.target);
  };

  const onEnd = () => {
    logger.log("Trailer ended, reverting to static banner");
    setIsPlaying(false);
    setIsMuted(true);
  };

  const toggleMute = () => {
    if (player) {
      if (isMuted) {
        player.unMute();
      } else {
        player.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const truncate = (str: string | undefined, n: number) => {
    return str && str.length > n ? str.substr(0, n - 1) + "..." : str;
  };

  const handlePlay = () => {
    if (movie) {
      const type = movie.media_type === "tv" || movie.name ? "tv" : "movie";
      navigate(`/watch/${type}/${movie.id}`);
    }
  };

  const handleMoreInfo = () => {
    if (movie) {
      let currentTime = 0;
      
      if (player && isPlaying) {
        currentTime = player.getCurrentTime();
        player.pauseVideo();
      }
      setIsPlaying(false);
      
      setBannerTrailerState({
        wasPlaying: isPlaying,
        trailerId: trailer,
        playbackTime: currentTime,
        wasMuted: isMuted,
      });
      
      openMoreInfo(movie);
    }
  };

  if (loading || !movie) {
    return <div className="h-[56vw] min-h-[400px] max-h-[95vh] bg-[#141414] animate-pulse" />;
  }

  return (
    <header
      className="relative h-[56vw] min-h-[400px] max-h-[85vh] overflow-hidden rounded-2xl mx-4 md:mx-14 mt-20 md:mt-24"
      style={{
        backgroundImage: `url(${getImageUrl(movie.backdrop_path, "original")})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
      }}
    >
      {isPlaying && trailer && (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <YouTube
            videoId={trailer}
            opts={{
              height: "100%",
              width: "100%",
              playerVars: {
                autoplay: 1,
                mute: 1,
                controls: 0,
                showinfo: 0,
                modestbranding: 1,
                rel: 0,
              },
            }}
            onReady={onPlayerReady}
            onEnd={onEnd}
            onError={() => setIsPlaying(false)}
            className="w-full h-full scale-[1.4] origin-center"
            iframeClassName="w-full h-full"
          />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
      
      {isPlaying && trailer && (
        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 md:top-7 md:right-6 z-20 p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md transition-all duration-200"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-white" />
          ) : (
            <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
          )}
        </button>
      )}

      {/* Main Content Area */}
      <div className="relative flex flex-col justify-end h-full px-6 pb-8 md:pb-12 md:px-12 lg:w-[60%] xl:w-[50%] z-10 space-y-3">
        {logoPath ? (
          <img
            src={getImageUrl(logoPath, "original")}
            alt={movie.title || movie.name || movie.original_name}
            className={`w-full object-contain object-left drop-shadow-2xl transition-all duration-700 ${
              isPlaying
                ? "max-w-[160px] sm:max-w-[200px] md:max-w-[260px]"
                : "max-w-[200px] sm:max-w-[320px] md:max-w-[420px] lg:max-w-[480px]"
            }`}
          />
        ) : (
          <h1
            className={`font-bold text-white drop-shadow-lg transition-all duration-700 ${
              isPlaying
                ? "text-xl sm:text-2xl md:text-3xl"
                : "text-3xl sm:text-4xl md:text-6xl lg:text-7xl"
            }`}
          >
            {movie.title || movie.name || movie.original_name}
          </h1>
        )}

        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#bcbcbc] font-medium flex-wrap">
          <span>{mediaLabel}</span>
          {movie.genres && movie.genres.length > 0 && (
            <>
              <span className="opacity-40">•</span>
              <span>{movie.genres.slice(0,2).map(g => g.name).join(", ")}</span>
            </>
          )}
          {releaseYear && (
            <>
              <span className="opacity-40">•</span>
              <span>{releaseYear}</span>
            </>
          )}
          {seasons && (
            <>
              <span className="opacity-40">•</span>
              <span>{seasons} Seasons</span>
            </>
          )}
        </div>

        {!isPlaying && (
          <p className="text-[13px] sm:text-sm md:text-base text-white/90 leading-snug drop-shadow-sm max-w-md">
            {truncate(movie.overview, 160)}
          </p>
        )}

        <div className="flex items-center gap-2 sm:gap-3 pt-1">
          <button
            onClick={handlePlay}
            className="flex items-center gap-1.5 bg-white text-black font-semibold text-sm sm:text-[15px] px-4 sm:px-6 py-1.5 sm:py-2 rounded-full transition-opacity hover:opacity-75 active:scale-[0.97]"
          >
            <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-black" />
            Play
          </button>
          <button
            onClick={handleMoreInfo}
            className="flex items-center gap-1.5 bg-[#6d6d6e]/70 text-white font-semibold text-sm sm:text-[15px] px-4 sm:px-6 py-1.5 sm:py-2 rounded-full transition-opacity hover:bg-[#6d6d6e]/90 active:scale-[0.97]"
          >
            <Info className="h-4 w-4 sm:h-5 sm:w-5" />
            More Info
          </button>
        </div>
      </div>

      {/* Dynamic Tags (Bottom Right) — driven by TMDB keywords & vote data */}
      {bannerTags.length > 0 && (
        <div className="absolute bottom-8 right-8 hidden md:flex items-center gap-3 z-20">
          {bannerTags.map((tag) => (
            <div
              key={tag.label}
              className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-md text-white text-[13px] font-medium shadow-xl"
            >
              <span role="img" aria-hidden="true">{tag.icon}</span>
              {tag.label}
            </div>
          ))}
        </div>
      )}
    </header>
  );
};

export default Banner;
