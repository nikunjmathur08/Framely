import React, { useState, useEffect, useRef } from "react";
import { getImageUrl } from "../services/tmdb";
import { BannerProps } from "../types";
import { Info, Play, PlayCircle, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { useTrailer } from "../hooks/useTrailer";
import YouTube from "react-youtube";

const Banner: React.FC<BannerProps> = ({ movie, loading }) => {
  const navigate = useNavigate();
  const { openMoreInfo, setPlayingTrailer, setBannerTrailerState } = useAppStore();
  const { trailer } = useTrailer(movie || { id: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [player, setPlayer] = useState<any>(null);

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
    console.log("Trailer ended, reverting to static banner");
    setIsPlaying(false);
    setIsMuted(true); // Reset mute state
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

  const handlePlayTrailer = () => {
    if (trailer && movie) {
      setPlayingTrailer(trailer, movie);
      window.location.hash = `play=${trailer}`;
    }
  };

  const handleMoreInfo = () => {
    if (movie) {
      let currentTime = 0;
      
      // Stop Banner's player and capture current playback position
      if (player && isPlaying) {
        currentTime = player.getCurrentTime(); // Get exact playback position
        player.pauseVideo();
      }
      setIsPlaying(false);
      
      // Pass the playing state, trailer, timestamp, and mute state to the modal
      setBannerTrailerState({
        wasPlaying: isPlaying,
        trailerId: trailer,
        playbackTime: currentTime,
        wasMuted: isMuted
      });
      
      openMoreInfo(movie);
    }
  };

  if (loading || !movie) {
    return <div className="h-[70vh] bg-[#141414] animate-pulse" />;
  }

  return (
    <header
      className="relative h-[70vh] md:h-[85vh] object-cover overflow-hidden"
      style={{
        backgroundImage: `url("${getImageUrl(
          movie.backdrop_path,
          "original"
        )}")`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
      }}
    >
      {isPlaying && trailer && (
        <div className="absolute inset-0 w-full h-full">
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

      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          isPlaying ? "bg-black/20" : "bg-black/30"
        }`}
      />

      {isPlaying && trailer && (
        <button
          onClick={toggleMute}
          className="absolute bottom-1/4 right-2 sm:right-4 md:right-10 z-20 p-2 sm:p-2.5 md:p-3 rounded-full border-2 border-white/60 bg-black/30 hover:bg-black/50 transition-all duration-300 hover:scale-110"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-white" />
          ) : (
            <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
          )}
        </button>
      )}

      <div className="relative flex flex-col justify-end h-full px-4 pb-16 sm:pb-20 md:pb-24 space-y-2 sm:space-y-3 md:space-y-4 md:px-10 lg:w-[60%] xl:w-[50%] z-40">
        {movie.images?.logos && movie.images.logos.length > 0 ? (
          <img
            src={getImageUrl(
              (
                movie.images.logos.find((logo) => logo.iso_639_1 === "en") ||
                movie.images.logos[0]
              ).file_path,
              "original"
            )}
            alt={movie.title || movie.name || movie.original_name}
            className={`w-full object-contain drop-shadow-2xl transition-all duration-700 ${
              isPlaying
                ? "max-w-[200px] sm:max-w-xs md:max-w-sm"
                : "max-w-[250px] sm:max-w-md md:max-w-lg lg:max-w-xl"
            }`}
          />
        ) : (
          <h1
            className={`font-bold text-white drop-shadow-lg transition-all duration-700 ${
              isPlaying
                ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl"
                : "text-2xl sm:text-3xl md:text-5xl lg:text-7xl"
            }`}
          >
            {movie.title || movie.name || movie.original_name}
          </h1>
        )}

        {!isPlaying && (
          <p className="max-w-xs text-xs sm:text-sm text-shadow-md text-white md:max-w-lg md:text-lg lg:max-w-2xl font-medium drop-shadow-md transition-opacity duration-500">
            {truncate(movie.overview, 150)}
          </p>
        )}

        <div className="flex space-x-2 sm:space-x-3">
          <button
            onClick={handlePlay}
            className="flex items-center gap-x-1 sm:gap-x-2 rounded px-3 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold transition hover:opacity-75 md:px-8 md:py-2.5 bg-white text-black"
          >
            <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-black" />
            Play
          </button>
          <button
            onClick={handleMoreInfo}
            className="flex items-center gap-x-1 sm:gap-x-2 rounded px-3 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold transition hover:opacity-75 md:px-8 md:py-2.5 bg-[gray]/70 text-white"
          >
            <Info className="h-4 w-4 sm:h-5 sm:w-5" />
            More Info
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-[#141414] to-transparent pointer-events-none" />
    </header>
  );
};

export default Banner;
