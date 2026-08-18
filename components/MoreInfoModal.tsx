import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Plus,
  Check,
  PlayCircle,
  Volume2,
  VolumeX,
  ChevronDown,
} from "lucide-react";
import { Movie } from "../types";
import { useAppStore } from "../store/useAppStore";
import { getImageUrl, TMDB_GENRES } from "../services/tmdb";
import { useNavigate } from "react-router-dom";
import { useTrailer } from "../hooks/useTrailer";
import { useTvSeasonData } from "../hooks/useTvSeasonData";
import YouTube, { YouTubeProps } from "react-youtube";
import axios from "axios";

const MoreInfoModal: React.FC = () => {
  const { selectedMovie, closeMoreInfo, addToList, removeFromList, isInList, bannerTrailerState, setBannerTrailerState } = useAppStore();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<number>(0); // Track where to start playback
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [cast, setCast] = useState<any[]>([]);
  const [castLoading, setCastLoading] = useState(false);

  // Memoize opts to prevent re-renders restarting the video
  // MUST be before any conditional returns
  const opts: YouTubeProps['opts'] = React.useMemo(() => ({
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      // mute: isMuted ? 1 : 0, // Removed reactive mute to prevent reload
      rel: 0,
      fs: 0,
      start: startTime > 0 ? Math.floor(startTime) : undefined,
    },
  }), [startTime]);

  // Call hooks before early return - React Rules of Hooks
  const { trailer } = useTrailer(selectedMovie || { id: 0 });
  const mediaType =
    selectedMovie?.media_type || (selectedMovie?.name ? "tv" : "movie");
  const { episodes, loading: episodesLoading } = useTvSeasonData(
    mediaType === "tv" ? selectedMovie?.id || null : null,
    selectedSeason
  );

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

  useEffect(() => {
    if (bannerTrailerState?.wasPlaying && bannerTrailerState?.trailerId && trailer) {
      if (bannerTrailerState.trailerId === trailer) {
        // Set start time from Banner's playback position
        if (bannerTrailerState.playbackTime) {
          setStartTime(bannerTrailerState.playbackTime);
        }
        // Preserve mute state from Banner
        if (bannerTrailerState.wasMuted !== undefined) {
          setIsMuted(bannerTrailerState.wasMuted);
        }
        // Auto-play immediately
        setIsPlaying(true);
      }
      setBannerTrailerState(null);
    } else if (trailer && !bannerTrailerState) {
      setIsPlaying(true);
    }
  }, [trailer, bannerTrailerState, setBannerTrailerState]);

  useEffect(() => {
    if (!selectedMovie) {
      setRecommendations([]);
      return;
    }
    
    // If recommendations are already available in the movie data, use them
    const existingRecs = selectedMovie.recommendations?.results;
    if (existingRecs && existingRecs.length > 0) {
      setRecommendations(existingRecs);
      return;
    }
    
    // Otherwise, fetch recommendations on-demand
    const fetchRecommendations = async () => {
      setRecommendationsLoading(true);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 
                           (import.meta.env.PROD ? '' : 'http://localhost:3001');
        const type = selectedMovie.media_type || (selectedMovie.name ? 'tv' : 'movie');
        const response = await axios.get(
          `${backendUrl}/api/tmdb/${type}/${selectedMovie.id}/recommendations`
        );
        setRecommendations(response.data.results?.slice(0, 12) || []);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        setRecommendations([]);
      } finally {
        setRecommendationsLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [selectedMovie]);

  // Fetch cast on-demand if not already present in selectedMovie.credits
  useEffect(() => {
    if (!selectedMovie) {
      setCast([]);
      return;
    }

    // Fast path: credits already enriched (e.g. from detail page)
    const existingCast = selectedMovie.credits?.cast;
    if (existingCast && existingCast.length > 0) {
      setCast(existingCast);
      return;
    }

    // Fetch credits on-demand
    const fetchCast = async () => {
      setCastLoading(true);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL ||
                           (import.meta.env.PROD ? '' : 'http://localhost:3001');
        const type = selectedMovie.media_type || (selectedMovie.name ? 'tv' : 'movie');
        const endpoint = type === 'tv'
          ? `${backendUrl}/api/tmdb/tv/${selectedMovie.id}/credits`
          : `${backendUrl}/api/tmdb/movie/${selectedMovie.id}/credits`;
        const response = await axios.get(endpoint);
        setCast(response.data.cast?.slice(0, 12) || []);
      } catch (error) {
        console.error('Failed to fetch cast:', error);
        setCast([]);
      } finally {
        setCastLoading(false);
      }
    };

    fetchCast();
  }, [selectedMovie]);

  if (!selectedMovie) return null;

  const added = isInList(selectedMovie.id);
  const displayTitle =
    selectedMovie.title || selectedMovie.name || selectedMovie.original_name;

  const handlePlay = () => {
    closeMoreInfo();
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
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

  const onPlayerReady = (event: any) => {
    setPlayer(event.target);
    // If we have a start time from Banner, seek to it immediately
    if (startTime > 0) {
      event.target.seekTo(startTime, true);
    }
    // Set mute state
    if (isMuted) {
      event.target.mute();
    } else {
      event.target.unMute();
    }
  };

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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.12, duration: 0.4 }}
          className="relative w-full max-w-4xl mt-8 mb-8 bg-[#181818] rounded-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={closeMoreInfo}
            className="absolute top-4 right-4 z-[100] bg-[#181818] rounded-full p-3.5 lg:p-2 lg:hover:bg-[#282828] transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Video Background Section */}
          <div className="relative w-full aspect-video bg-black overflow-hidden">
            <div className="relative w-full h-full">
              {trailer && isPlaying ? (
                <div className="w-full h-full relative">
                  <YouTube
                    videoId={trailer}
                    opts={opts}
                    onReady={onPlayerReady}
                    onEnd={() => setIsPlaying(false)}
                    onError={() => setIsPlaying(false)}
                    className="w-full h-full scale-[1.4] origin-center"
                    iframeClassName="w-full h-full"
                  />

                  {/* Mute/Unmute Button */}
                  <button
                    onClick={toggleMute}
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
            <div className="absolute -bottom-16 md:-bottom-4 -left-2 right-0 p-8 pb-16">
              {/* Title/Logo */}
              {logoPath ? (
                <img
                  src={getImageUrl(logoPath, "w500")}
                  alt={displayTitle}
                  className={`object-contain mb-4 md:mb-6 drop-shadow-2xl transition-all duration-700 ${
                    isPlaying
                      ? "max-w-[140px] sm:max-w-[180px] md:max-w-[220px]"
                      : "w-1/2 sm:w-2/3 md:w-full max-w-[200px] sm:max-w-xs md:max-w-md max-h-24 sm:max-h-28"
                  }`}
                />
              ) : (
                <h1
                  className={`font-bold text-white mb-6 drop-shadow-2xl transition-all duration-700 ${
                    isPlaying
                      ? "text-xl sm:text-2xl md:text-3xl"
                      : "text-4xl md:text-5xl"
                  }`}
                >
                  {displayTitle}
                </h1>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={handlePlay}
                  className="bg-white hover:bg-white/90 active:scale-[0.97] text-black font-bold px-4 py-1.5 sm:px-6 sm:py-2 md:px-8 md:py-3 rounded flex items-center gap-2 transition-[transform,background-color] text-xs sm:text-sm md:text-base"
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 fill-black" />
                  <span>Play</span>
                </button>

                <button
                  onClick={handleListToggle}
                  className="border-2 border-gray-400 text-white hover:border-white active:scale-90 transition-[transform,border-color] rounded-full w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 flex items-center justify-center bg-[#2a2a2a]/60"
                  title={added ? "Remove from My List" : "Add to My List"}
                >
                  {added ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
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
                {/* Genres */}
                {getGenreNames().length > 0 && (
                  <div>
                    <span className="text-gray-500">Genres: </span>
                    <span className="text-gray-300">
                      {getGenreNames().join(", ")}
                    </span>
                  </div>
                )}

                {/* Maturity */}
                <div>
                  <span className="text-gray-500">This {mediaType === 'tv' ? 'show' : 'movie'} is: </span>
                  <span className="text-gray-300">
                    {getGenreNames()[0] || "Exciting"}
                  </span>
                </div>
              </div>
            </div>

            {/* Cast Section */}
            {(cast.length > 0 || castLoading) && (
              <div className="pt-6 border-t border-gray-800">
                <h3 className="text-xl font-semibold text-white mb-4">Cast</h3>
                {castLoading ? (
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 w-20 animate-pulse">
                        <div className="w-16 h-16 rounded-full bg-gray-700" />
                        <div className="h-3 w-14 bg-gray-700 rounded" />
                        <div className="h-2.5 w-12 bg-gray-800 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pt-2">
                    {cast.slice(0, 12).map((member: any) => {
                      const initials = member.name
                        ? member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                        : '?';
                      return (
                        <div
                          key={member.id}
                          className="flex-shrink-0 flex flex-col items-center gap-2 w-20 group cursor-default"
                          title={`${member.name}${member.character ? ` as ${member.character}` : ''}`}
                        >
                          {/* Profile photo */}
                          <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-white/40 transition-all duration-300">
                            {member.profile_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                                alt={member.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                                <span className="text-gray-300 text-sm font-bold">{initials}</span>
                              </div>
                            )}
                          </div>
                          {/* Actor name */}
                          <p className="text-white text-xs font-medium text-center leading-tight truncate w-full">
                            {member.name}
                          </p>
                          {/* Character name */}
                          {member.character && (
                            <p className="text-gray-500 text-[10px] text-center leading-tight truncate w-full -mt-1">
                              {member.character}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Episodes Section - Only for TV Series */}
            {mediaType === "tv" &&
              selectedMovie.seasons &&
              selectedMovie.seasons.length > 0 && (
                <div className="pt-6 border-t border-gray-800">
                  {/* Header with Season Selector */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">
                      Episodes
                    </h3>

                    {/* Season Selector Dropdown */}
                    <div className="relative">
                      <select
                        value={selectedSeason}
                        onChange={(e) =>
                          setSelectedSeason(Number(e.target.value))
                        }
                        className="appearance-none bg-[#2f2f2f] text-white px-4 py-2 pr-10 rounded border border-gray-600 hover:border-gray-400 focus:border-white focus:outline-none cursor-pointer transition"
                      >
                        {selectedMovie.seasons
                          .filter((season) => season.season_number > 0)
                          .map((season) => (
                            <option
                              key={season.id}
                              value={season.season_number}
                            >
                              {season.name}
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Season Info */}
                  {selectedMovie.seasons.find(
                    (s) => s.season_number === selectedSeason
                  ) && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-400">
                        {
                          selectedMovie.seasons.find(
                            (s) => s.season_number === selectedSeason
                          )?.name
                        }
                        :
                        <span className="ml-2 text-gray-500">
                          {
                            selectedMovie.seasons.find(
                              (s) => s.season_number === selectedSeason
                            )?.overview
                          }
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Episodes List */}
                  <div className="space-y-2">
                    {episodesLoading ? (
                      <div className="text-center py-8 text-gray-400">
                        Loading episodes...
                      </div>
                    ) : episodes.length > 0 ? (
                      episodes.map((episode) => {
                        const episodeRuntime = episode.runtime || 45;
                        return (
                          <div
                            key={episode.id}
                            className="group border-b border-gray-600 rounded-md overflow-hidden cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => {
                              navigate(
                                `/watch/tv/${selectedMovie.id}?season=${selectedSeason}&episode=${episode.episode_number}`
                              );
                              closeMoreInfo();
                            }}
                          >
                            <div className="flex gap-4 p-3">
                              {/* Episode Number */}
                              <div className="flex-shrink-0 w-8 flex items-center justify-center">
                                <span className="text-2xl font-bold text-gray-500">
                                  {episode.episode_number}
                                </span>
                              </div>

                              {/* Episode Thumbnail */}
                              <div className="relative flex-shrink-0 w-36 aspect-video bg-black rounded overflow-hidden">
                                {episode.still_path ? (
                                  <img
                                    src={getImageUrl(
                                      episode.still_path,
                                      "w500"
                                    )}
                                    alt={episode.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                    <PlayCircle className="w-8 h-8 text-gray-500" />
                                  </div>
                                )}
                                {/* Play Button Overlay on Hover */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                  <div className="border-2 border-white rounded-full p-2">
                                    <Play className="w-6 h-6 text-white fill-white" />
                                  </div>
                                </div>
                              </div>

                              {/* Episode Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h4 className="text-white font-medium line-clamp-1">
                                    {episode.name}
                                  </h4>
                                  <span className="text-gray-400 text-sm flex-shrink-0">
                                    {episodeRuntime}m
                                  </span>
                                </div>
                                <p className="text-gray-400 text-sm line-clamp-2">
                                  {episode.overview ||
                                    "No description available."}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        No episodes available
                      </div>
                    )}
                  </div>
                </div>
              )}
            {/* More Like This Section */}
            {(recommendations.length > 0 || recommendationsLoading) && (
                <div className="pt-6 border-t border-gray-800">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    More Like This
                  </h3>
                  {recommendationsLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-[#2f2f2f] rounded-lg overflow-hidden animate-pulse">
                          <div className="w-full aspect-video bg-gray-700" />
                          <div className="p-3 space-y-2">
                            <div className="h-3 bg-gray-700 rounded w-1/3" />
                            <div className="h-4 bg-gray-700 rounded w-2/3" />
                            <div className="h-3 bg-gray-700 rounded w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {recommendations
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
                  )}
                </div>
              )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MoreInfoModal;
