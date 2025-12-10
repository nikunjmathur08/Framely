import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Plus,
  Check,
  ThumbsUp,
  PlayCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Movie } from "../types";
import { useAppStore } from "../store/useAppStore";
import { getImageUrl, TMDB_GENRES } from "../services/tmdb";
import { useNavigate } from "react-router-dom";
import { useTrailer } from "../hooks/useTrailer";
import YouTube, { YouTubeProps } from "react-youtube";

const MoreInfoModal: React.FC = () => {
  const { selectedMovie, closeMoreInfo, addToList, removeFromList, isInList } =
    useAppStore();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(true);

  // Call hooks before early return - React Rules of Hooks
  const { trailer } = useTrailer(selectedMovie || { id: 0 });

  // All hooks must be before the early return
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMoreInfo();
      }
    };

    if (selectedMovie) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [selectedMovie, closeMoreInfo]);

  if (!selectedMovie) return null;

  const mediaType =
    selectedMovie.media_type || (selectedMovie.name ? "tv" : "movie");
  const added = isInList(selectedMovie.id);
  const displayTitle =
    selectedMovie.title || selectedMovie.name || selectedMovie.original_name;

  const handlePlay = () => {
    navigate(`/watch/${mediaType}/${selectedMovie.id}`);
  };

  const handleListToggle = () => {
    if (added) {
      removeFromList(selectedMovie.id);
    } else {
      addToList(selectedMovie);
    }
  };

  const formatDuration = (runtime: number) => {
    const h = Math.floor(runtime / 60);
    const m = runtime % 60;
    return `${h}h ${m}m`;
  };

  const getGenreNames = () => {
    if (!selectedMovie.genre_ids) return [];
    return selectedMovie.genre_ids
      .slice(0, 3)
      .map((id) => TMDB_GENRES[id])
      .filter(Boolean);
  };

  const getReleaseYear = () => {
    const date = selectedMovie.release_date || selectedMovie.first_air_date;
    return date ? new Date(date).getFullYear() : "";
  };

  const logoPath =
    selectedMovie.images?.logos?.find((img: any) => img.iso_639_1 === "en")
      ?.file_path || selectedMovie.images?.logos?.[0]?.file_path;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm"
        onClick={closeMoreInfo}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl mt-8 mb-8 bg-[#181818] rounded-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={closeMoreInfo}
            className="absolute top-4 right-4 z-50 bg-[#181818] rounded-full p-2 hover:bg-[#282828] transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Video Background Section */}
          <div className="relative w-full aspect-video bg-black">
            <div
              key={trailer ? "yt-${trailer}" : "img-modal"}
              className="relative w-full h-full"
            >
              {trailer ? (
                <div className="w-full h-full relative">
                  <YouTube
                    videoId={trailer}
                    opts={{
                      height: "100%",
                      width: "100%",
                      playerVars: {
                        autoplay: 1,
                        controls: 0,
                        modestbranding: 1,
                        mute: isMuted ? 1 : 0,
                        rel: 0,
                        fs: 0,
                      },
                    }}
                    className="w-full h-full"
                    iframeClassName="w-full h-full"
                  />

                  {/* Mute/Unmute Button */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute bottom-4 right-4 z-50 bg-black/70 hover:bg-black/90 rounded-full p-3 transition-colors group"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                    )}
                  </button>
                </div>
              ) : (
                /* Static Backdrop Image (fallback when no trailer) */
                <img
                  src={getImageUrl(
                    selectedMovie.backdrop_path || selectedMovie.poster_path,
                    "original"
                  )}
                  alt={displayTitle}
                  className="w-full h-full object-cover opacity-80"
                />
              )}
            </div>

            {/* Gradient Overlay for better readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent pointer-events-none" />

            {/* Content Overlay on Video */}
            <div className="absolute -bottom-4 -left-2 right-0 p-8 pb-16">
              {/* Title/Logo */}
              {logoPath ? (
                <img
                  src={getImageUrl(logoPath, "w500")}
                  alt={displayTitle}
                  className="w-2/3 max-w-md max-h-32 object-contain mb-6 drop-shadow-2xl"
                />
              ) : (
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-2xl">
                  {displayTitle}
                </h1>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={handlePlay}
                  className="bg-white hover:bg-white/90 text-black font-bold px-8 py-3 rounded flex items-center gap-2 transition"
                >
                  <Play className="w-6 h-6 fill-black" />
                  <span>Play</span>
                </button>

                <button
                  onClick={handleListToggle}
                  className="border-2 border-gray-400 text-white hover:border-white transition rounded-full w-11 h-11 flex items-center justify-center bg-[#2a2a2a]/60"
                  title={added ? "Remove from My List" : "Add to My List"}
                >
                  {added ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </button>

                <button
                  className="border-2 border-gray-400 text-white hover:border-white transition rounded-full w-11 h-11 flex items-center justify-center bg-[#2a2a2a]/60"
                  title="Like"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="p-8 space-y-6">
            {/* Metadata Row */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#46d369] font-semibold">
                {(selectedMovie.vote_average * 10).toFixed(0)}% Match
              </span>
              {getReleaseYear() && (
                <span className="text-gray-300">{getReleaseYear()}</span>
              )}
              <span className="border border-gray-500 px-1.5 py-0.5 text-xs text-gray-400">
                HD
              </span>
              <span className="text-gray-300">
                {selectedMovie.runtime
                  ? formatDuration(selectedMovie.runtime)
                  : selectedMovie.number_of_seasons
                  ? `${selectedMovie.number_of_seasons} Season${
                      selectedMovie.number_of_seasons > 1 ? "s" : ""
                    }`
                  : mediaType === "movie"
                  ? "1h 50m"
                  : "1 Season"}
              </span>
            </div>

            {/* Description and Metadata Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Left Column - Description */}
              <div className="md:col-span-2 space-y-4">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {selectedMovie.overview || "No description available."}
                </p>
              </div>

              {/* Right Column - Additional Info */}
              <div className="space-y-3 text-sm">
                {/* Cast */}
                {selectedMovie.credits?.cast &&
                  selectedMovie.credits.cast.length > 0 && (
                    <div>
                      <span className="text-gray-500">Cast: </span>
                      <span className="text-gray-300">
                        {selectedMovie.credits.cast
                          .slice(0, 4)
                          .map((c: any) => c.name)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                {/* Genres */}
                {getGenreNames().length > 0 && (
                  <div>
                    <span className="text-gray-500">Genres: </span>
                    <span className="text-gray-300">
                      {getGenreNames().join(", ")}
                    </span>
                  </div>
                )}

                {/* Rating */}
                <div>
                  <span className="text-gray-500">This show is: </span>
                  <span className="text-gray-300">
                    {getGenreNames()[0] || "Exciting"}
                  </span>
                </div>
              </div>
            </div>

            {/* More Like This Section */}
            {selectedMovie.recommendations?.results &&
              selectedMovie.recommendations.results.length > 0 && (
                <div className="pt-6 border-t border-gray-800">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    More Like This
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedMovie.recommendations.results
                      .slice(0, 6)
                      .map((rec: any) => (
                        <div
                          key={rec.id}
                          className="bg-[#2f2f2f] rounded-lg overflow-hidden cursor-pointer hover:bg-[#3f3f3f] transition group"
                          onClick={() => {
                            closeMoreInfo();
                            setTimeout(() => {
                              const recMediaType =
                                rec.media_type || (rec.name ? "tv" : "movie");
                              navigate(`/watch/${recMediaType}/${rec.id}`);
                            }, 300);
                          }}
                        >
                          <img
                            src={getImageUrl(
                              rec.backdrop_path || rec.poster_path,
                              "w500"
                            )}
                            alt={rec.title || rec.name}
                            className="w-full aspect-video object-cover"
                          />
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[#46d369] text-xs font-semibold">
                                {(rec.vote_average * 10).toFixed(0)}% Match
                              </span>
                              <span className="border border-gray-600 px-1 py-0.5 text-[10px] text-gray-400">
                                HD
                              </span>
                            </div>
                            <p className="text-white text-sm font-medium line-clamp-1 mb-1">
                              {rec.title || rec.name}
                            </p>
                            <p className="text-gray-400 text-xs line-clamp-2">
                              {rec.overview}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MoreInfoModal;
