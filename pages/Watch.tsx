import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Star, Calendar, Clock, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import axios, { requests, TMDB_GENRES } from '../services/tmdb';
import { TvShowDetails, Movie, Season } from '../types';
import ProtectedIframe from '../components/ProtectedIframe';
import AdBlockerModal from '../components/AdBlockerModal';
import ContentErrorPage from '../components/ContentErrorPage';
import { useAppStore } from '../store/useAppStore';
import { shouldShowAdBlockerModal } from '../utils/adBlockerDetection';
import { useSeo } from '../hooks/useSeo';
import { generateMovieSchema, generateTvSchema, getFullImageUrl } from '../utils/seoHelpers';
import { logger } from '../utils/logger';

interface NxshaHistoryEvent {
  media: { type: 'movie' | 'tv'; id: string; season?: number; episode?: number };
  playback: { currentTime: number; duration: number } | null;
}

interface NxshaHistoryController {
  seek: (currentTime: number) => boolean;
  destroy: () => void;
}

declare global {
  interface Window {
    NxshaHistory?: {
      attach: (
        frame: HTMLIFrameElement,
        options: {
          historyId: string;
          onReady?: (event: NxshaHistoryEvent) => void;
          onProgress?: (event: NxshaHistoryEvent) => void;
        }
      ) => NxshaHistoryController;
    };
  }
}

let nxshaHistorySdk: Promise<void> | null = null;

const loadNxshaHistorySdk = () => {
  if (window.NxshaHistory) return Promise.resolve();
  if (nxshaHistorySdk) return nxshaHistorySdk;

  nxshaHistorySdk = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://nxsha.space/embed-history.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Nxsha history support.'));
    document.head.appendChild(script);
  });

  return nxshaHistorySdk;
};

interface PlayerConfig {
  id: string;
  name: string;
  getSrc: (type: 'tv' | 'movie', id: string, season: number, episode: number, progress?: number) => string;
}

const PLAYER_CONFIGS: PlayerConfig[] = [
  {
    id: 'cinesrc',
    name: 'CineSRC',
    getSrc: (type, id, season, episode, progress) => {
      const params = new URLSearchParams({ color: '#e50914', autonext: 'true', autoskip: 'true' });
      if (progress && progress > 10) params.append('t', Math.floor(progress).toString());
      if (type === 'movie') return `https://cinesrc.st/embed/movie/${id}?${params.toString()}`;
      params.append('s', String(season));
      params.append('e', String(episode));
      return `https://cinesrc.st/embed/tv/${id}?${params.toString()}`;
    },
  },
  {
    id: 'yapgrid',
    name: 'YapGrid',
    getSrc: (type, id, season, episode) => {
      const path = type === 'movie' ? `movie/${id}` : `tv/${id}/${season}/${episode}`;
      return `https://yapgrid.com/embed/${path}?autoplay=1`;
    },
  },
  {
    id: 'vidplus',
    name: 'VidPlus',
    getSrc: (type, id, season, episode, progress) => {
      const params = new URLSearchParams({ autoplay: 'true', nextButton: 'true' });
      if (progress && progress > 10) params.append('progress', Math.floor(progress).toString());
      const path = type === 'movie' ? `movie/${id}` : `tv/${id}/${season}/${episode}`;
      return `https://player.vidplus.to/embed/${path}?${params.toString()}`;
    },
  },
  {
    id: 'mappleuk',
    name: 'MappleUK',
    getSrc: (type, id, season, episode, progress) => {
      const params = new URLSearchParams({ autoPlay: 'true', nextButton: 'true', autoNext: 'true', theme: 'e50914' });
      if (progress && progress > 10) params.append('startAt', Math.floor(progress).toString());
      const path = type === 'movie' ? `movie/${id}` : `tv/${id}-${season}-${episode}`;
      return `https://mapple.uk/watch/${path}?${params.toString()}`;
    },
  },
];

const Watch: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [tvDetails, setTvDetails] = useState<TvShowDetails | null>(null);
  const [movieDetails, setMovieDetails] = useState<Movie | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<Season | null>(null);
  const [showAdBlockerModal, setShowAdBlockerModal] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { 
    updateWatchHistory, 
    getWatchHistory, 
    hideAdBlockerModal, 
    setHideAdBlockerModal,
    preferredPlayer,
    setPreferredPlayer,
  } = useAppStore();

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const isAnime = location.pathname.startsWith('/watch/anime/');
  const playerFrameRef = useRef<HTMLIFrameElement>(null);
  const historyKey = `framely:${isAnime ? 'anime:' : ''}${mediaType}:${id || ''}`;

  // Compute SEO data based on loaded details
  const seoData = useMemo(() => {
    const details = mediaType === 'tv' ? tvDetails : movieDetails;
    if (!details) return null;
    
    const title = details.title || details.name || 'Watch';
    const description = details.overview || `Watch ${title} on Framely`;
    const image = getFullImageUrl(details.backdrop_path || details.poster_path, 'backdrop', 'large');
    
    return {
      title: mediaType === 'tv' && season && episode 
        ? `${title} - S${season} E${episode}` 
        : title,
      description,
      image,
      type: mediaType === 'tv' ? 'video.tv_show' as const : 'video.movie' as const,
      jsonLd: mediaType === 'tv' && tvDetails 
        ? generateTvSchema(tvDetails)
        : movieDetails && generateMovieSchema(movieDetails),
    };
  }, [mediaType, tvDetails, movieDetails, season, episode]);

  // Apply SEO
  useSeo(seoData || {});

  // Load history on mount and stamp mediaType so the entry is always identifiable
  // even if the player never fires a postMessage.
  useEffect(() => {
    if (id) {
      const history = getWatchHistory(historyKey) || getWatchHistory(id);
      if (history) {
        if (history.season) setSeason(history.season);
        if (history.episode) setEpisode(history.episode);
      }
      updateWatchHistory(historyKey, { mediaType });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, historyKey, mediaType]);

  // Check ad blocker
  useEffect(() => {
    const checkAdBlocker = async () => {
      const shouldShow = await shouldShowAdBlockerModal(hideAdBlockerModal);
      setShowAdBlockerModal(shouldShow);
    };
    checkAdBlocker();
  }, [hideAdBlockerModal]);

  const updateHistory = useCallback((newSeason: number | undefined, newEpisode: number | undefined, timestamp?: number, duration?: number) => {
    if (id) {
        const currentHistory = getWatchHistory(historyKey);
        const currentMovie = mediaType === 'tv' ? tvDetails : movieDetails;
        const episodeChanged =
          newSeason !== undefined && newEpisode !== undefined &&
          (newSeason !== currentHistory?.season || newEpisode !== currentHistory?.episode);
        updateWatchHistory(historyKey, {
            season: newSeason ?? currentHistory?.season, 
            episode: newEpisode ?? currentHistory?.episode,
            timestamp: timestamp ?? (episodeChanged ? 0 : currentHistory?.timestamp),
            duration: duration ?? (episodeChanged ? undefined : currentHistory?.duration),
            mediaType,
            movie: currentMovie || currentHistory?.movie,
        });
    }
  }, [id, historyKey, mediaType, tvDetails, movieDetails, getWatchHistory, updateWatchHistory]);

  // Nxsha's SDK validates player-origin history messages and provides accurate resume support.
  useEffect(() => {
    if (!isAnime) return;
    let active = true;
    let controller: NxshaHistoryController | undefined;

    loadNxshaHistorySdk()
      .then(() => {
        const frame = playerFrameRef.current;
        if (!active || !frame || !window.NxshaHistory) return;

        const savedHistory = getWatchHistory(historyKey) || (id ? getWatchHistory(id) : undefined);
        const resumeAt = savedHistory?.timestamp;
        const canResume = resumeAt && resumeAt > 10 &&
          (!savedHistory.duration || resumeAt < savedHistory.duration * 0.95);

        controller = window.NxshaHistory.attach(frame, {
          historyId: historyKey,
          onReady: () => {
            if (canResume) controller?.seek(resumeAt);
          },
          onProgress: (event) => {
            if (!event.playback) return;
            updateHistory(
              event.media.type === 'tv' ? event.media.season : undefined,
              event.media.type === 'tv' ? event.media.episode : undefined,
              event.playback.currentTime,
              event.playback.duration,
            );
          },
        });
      })
      .catch((error) => logger.error('Failed to initialize Nxsha history support', error));

    return () => {
      active = false;
      controller?.destroy();
    };
  }, [isAnime, mediaType, id, season, episode, historyKey, getWatchHistory, updateHistory]);

  // Original providers use their own postMessage formats for time updates.
  useEffect(() => {
    if (isAnime) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch { return; }
        }
        if (!data) return;

        if (data.type === 'cinesrc:timeupdate') {
          updateHistory(season, episode, data.currentTime, data.duration);
        } else if (data.type === 'PLAYER_EVENT' && data.data) {
          updateHistory(season, episode, data.data.currentTime, data.data.duration);
        } else if (data.timestamp !== undefined && data.duration !== undefined) {
          updateHistory(season, episode, data.timestamp, data.duration);
        }
      } catch (error) {
        logger.error('Error processing player history message', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isAnime, season, episode, updateHistory]);

  // Fetch Media Details
  useEffect(() => {
    if (!id) return;
    async function fetchDetails() {
      setIsLoading(true);
      setContentError(null);
      try {
        if (mediaType === 'tv') {
          const res = await axios.get(requests.getTvDetails(id!));
          setTvDetails(res.data);
        } else {
          const res = await axios.get(requests.getMovieDetails(id!));
          setMovieDetails(res.data);
        }
        setIsLoading(false);
      } catch (err: any) {
        logger.error(`Failed to fetch ${mediaType} details:`, err);
        setContentError(
          err.response?.status === 404 
            ? 'This content could not be found' 
            : "We're having trouble loading this content"
        );
        setIsLoading(false);
      }
    }
    fetchDetails();
  }, [mediaType, id]);

  // Fetch Season Details
  useEffect(() => {
    if (mediaType === 'tv' && id) {
      async function fetchSeason() {
        try {
          const res = await axios.get(requests.getTvSeasonDetails(id!, season));
          setSeasonDetails(res.data);
        } catch (err) {
          logger.error("Failed to fetch season details", err);
        }
      }
      fetchSeason();
    }
  }, [mediaType, id, season]);

  const currentSrc = useMemo(() => {
    if (!id) return '';
    if (!isAnime) {
      const history = getWatchHistory(historyKey) || getWatchHistory(id);
      const progress = history?.timestamp && (!history.duration || history.timestamp < history.duration * 0.95)
        ? history.timestamp
        : 0;
      const config = PLAYER_CONFIGS.find((player) => player.id === preferredPlayer) || PLAYER_CONFIGS[0];
      return config.getSrc(mediaType, id, season, episode, progress);
    }

    const path = mediaType === 'movie' ? `movie/${id}` : `tv/${id}/${season}/${episode}`;
    const params = new URLSearchParams({
      autoplay: 'true',
      autoplayNext: 'true',
      color: 'netflix',
      history: '1',
      history_id: historyKey,
      parent_origin: window.location.origin,
    });
    return `https://nxsha.space/embed/${path}?${params.toString()}`;
  }, [id, season, episode, mediaType, historyKey, isAnime, getWatchHistory, preferredPlayer]);

  const details = mediaType === 'tv' ? tvDetails : movieDetails;
  const releaseYear = (details?.release_date || details?.first_air_date)?.split('-')[0];
  const rating = details?.vote_average?.toFixed(1);
  const genres = details?.genres ? details.genres.map(g => g.name) : (details?.genre_ids ? details.genre_ids.map(id => TMDB_GENRES[id]) : []);
  const cast = details?.credits?.cast?.slice(0, 5).map(c => c.name).join(', ');

  const isEpisodeReleased = (airDate: string) => {
    if (!airDate) return false;
    return new Date(airDate) <= new Date();
  };

  const handleRetry = () => {
    setContentError(null);
    setIsLoading(true);
    // Re-trigger the fetch by updating a key dependency would be ideal,
    // but we can just reload the page for simplicity
    window.location.reload();
  };

  // Show error page if content failed to load
  if (contentError) {
    return <ContentErrorPage errorMessage={contentError} />;
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white flex flex-col overflow-x-clip">
      {/* Ad Blocker Modal */}
      {showAdBlockerModal && (
        <AdBlockerModal
          onClose={() => setShowAdBlockerModal(false)}
          onDontShowAgain={() => {
            setHideAdBlockerModal(true);
            setShowAdBlockerModal(false);
          }}
        />
      )}

      {/* Header */}
      <div className="p-4 flex items-center justify-between">
         <button 
          onClick={() => navigate(-1)}
          className="text-white hover:text-gray-300 transition bg-white/10 backdrop-blur-md rounded-full p-2 hover:bg-white/20"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* Player Section */}
      <div className="w-full max-w-6xl mx-auto aspect-video bg-black relative shadow-2xl overflow-hidden md:mt-4 md:rounded-2xl">
        <ProtectedIframe
          src={currentSrc}
          title={mediaType === 'tv' && tvDetails ? `${tvDetails.name} - S${season} E${episode}` : (movieDetails?.title || 'Movie')}
          iframeRef={playerFrameRef}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Info Section */}
      <div className="max-w-8xl mx-auto w-full p-6 md:p-8 space-y-2">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <h1 className="text-3xl md:text-5xl font-bold">{details?.title || details?.name}</h1>
            {!isAnime && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest mr-2">Player:</span>
                <div className="flex flex-wrap gap-2 p-0.5 bg-[#0a0a0a] rounded-lg border border-[#242424]">
                  {PLAYER_CONFIGS.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setPreferredPlayer(player.id)}
                      className="relative px-4 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors duration-300 outline-none"
                    >
                      <span className={`relative z-10 transition-colors duration-300 ${
                        preferredPlayer === player.id ? 'text-black' : 'text-gray-400 hover:text-white'
                      }`}>
                        {player.name}
                      </span>
                      {preferredPlayer === player.id && (
                        <motion.div
                          layoutId="activePlayerPill"
                          className="absolute inset-0 bg-neutral-200 rounded-md shadow-[0_0_15px_rgba(229,229,229,0.15)]"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-gray-400">
            {rating && (
              <div className="flex items-center text-green-500 font-semibold">
                <Star className="w-4 h-4 fill-current mr-1" />
                {rating}
              </div>
            )}
            {releaseYear && (
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {releaseYear}
              </div>
            )}
            {mediaType === 'movie' && movieDetails?.runtime && (
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {Math.floor(movieDetails.runtime / 60)}h {movieDetails.runtime % 60}m
              </div>
            )}
            {mediaType === 'tv' && tvDetails?.number_of_seasons && (
              <div>{tvDetails.number_of_seasons} Seasons</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {genres.slice(0, 3).map((genre, idx) => (
              <span key={idx} className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium">
                {genre}
              </span>
            ))}
          </div>

          <p className="text-gray-300 text-sm md:text-lg leading-relaxed max-w-4xl">
            {details?.overview}
          </p>

          {cast && (
            <p className="text-gray-500 text-sm">
              <span className="text-gray-400 font-semibold">Cast:</span> {cast}
            </p>
          )}
        </div>

        {/* TV Episodes Section */}
        {mediaType === 'tv' && tvDetails && (
          <div className="space-y-6 pt-10 border-t border-white/10 mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Episodes</h2>
              
              <div className="relative group">
                <select 
                  value={season}
                  onChange={(e) => {
                    const newSeason = Number(e.target.value);
                    setSeason(newSeason);
                    setEpisode(1);
                    updateHistory(newSeason, 1);
                  }}
                  className="appearance-none bg-[#1a1a1a] border border-white/10 text-white px-4 py-2 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e50914] cursor-pointer hover:bg-[#252525] transition-colors"
                >
                  {tvDetails.seasons.map(s => (
                    <option key={s.id} value={s.season_number}>
                      Season {s.season_number}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {seasonDetails?.episodes?.map((ep) => {
                const released = isEpisodeReleased(ep.air_date);
                const active = ep.episode_number === episode;
                
                return (
                  <button
                    key={ep.id}
                    onClick={() => {
                      if (released) {
                        setEpisode(ep.episode_number);
                        updateHistory(season, ep.episode_number);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    disabled={!released}
                    className={`text-left p-4 rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                      active 
                        ? 'border-[#e50914] bg-[#e50914]/10 shadow-[0_0_20px_rgba(229,9,20,0.15)]' 
                        : released 
                          ? 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10' 
                          : 'border-dashed border-white/20 bg-transparent opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex flex-col h-full justify-between">
                      <div className="space-y-1">
                        <div className={`text-xs font-bold uppercase tracking-wider ${active ? 'text-[#e50914]' : 'text-gray-500'}`}>
                          Episode {ep.episode_number}
                        </div>
                        <div className={`font-semibold line-clamp-1 ${active ? 'text-white' : 'text-gray-200'}`}>
                          {ep.name || `Episode ${ep.episode_number}`}
                        </div>
                      </div>
                      
                      {!released && (
                        <div className="mt-4 text-[10px] text-gray-500 font-medium">
                          Coming {ep.air_date ? new Date(ep.air_date).toLocaleDateString() : 'Soon'}
                        </div>
                      )}
                    </div>

                    {active && (
                      <div className="absolute top-0 right-0 p-2">
                        <div className="w-2 h-2 rounded-full bg-[#e50914] animate-pulse" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watch;
