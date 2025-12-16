import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios, { requests } from '../services/tmdb';
import { TvShowDetails } from '../types';
import ProtectedIframe from '../components/ProtectedIframe';
import AdBlockerModal from '../components/AdBlockerModal';
import { useAppStore } from '../store/useAppStore';
import { shouldShowAdBlockerModal } from '../utils/adBlockerDetection';

const Watch: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [tvDetails, setTvDetails] = useState<TvShowDetails | null>(null);
  const [showAdBlockerModal, setShowAdBlockerModal] = useState(false);
  const { updateWatchHistory, getWatchHistory, hideAdBlockerModal, setHideAdBlockerModal } = useAppStore();

  // Validating type for TypeScript safety in logic
  const mediaType = type === 'tv' ? 'tv' : 'movie';

  const lastUpdateRef = React.useRef<number>(0);

  // Load history on mount
  useEffect(() => {
    if (id) {
      const history = getWatchHistory(id);
      if (history) {
        if (history.season) setSeason(history.season);
        if (history.episode) setEpisode(history.episode);
      }
    }
  }, [id, getWatchHistory]);

  // Check if we should show the ad blocker modal
  useEffect(() => {
    const checkAdBlocker = async () => {
      const shouldShow = await shouldShowAdBlockerModal(hideAdBlockerModal);
      setShowAdBlockerModal(shouldShow);
    };
    
    checkAdBlocker();
  }, [hideAdBlockerModal]);

  // Stable updateHistory function using useCallback
  const updateHistory = React.useCallback((newSeason: number | undefined, newEpisode: number | undefined, timestamp?: number, duration?: number) => {
    if (id) {
        // preserve existing season/episode if not provided
        const currentHistory = getWatchHistory(id);
        updateWatchHistory(id, { 
            season: newSeason ?? currentHistory?.season, 
            episode: newEpisode ?? currentHistory?.episode,
            timestamp, 
            duration 
        });
        console.log("Saving history:", { id, season: newSeason, episode: newEpisode, timestamp });
    }
  }, [id, getWatchHistory, updateWatchHistory]);

  // Vidking Event Listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        try {
            // Vidking sends messages, sometimes as string, sometimes as object
            let data = event.data;
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch {
                    return; // Not a JSON message, ignore
                }
            }

            if (data?.type === 'PLAYER_EVENT' && data?.data) {
                const { event: playerEvent, currentTime, duration } = data.data;
                
                // We only care about specific events
                if (['timeupdate', 'pause', 'ended'].includes(playerEvent)) {
                    const now = Date.now();
                    
                    // Throttle updates for timeupdate to once every 5 seconds
                    if (playerEvent === 'timeupdate') {
                        if (now - lastUpdateRef.current < 5000) return;
                        lastUpdateRef.current = now;
                    }

                    // Save to store
                    // Note: We use the current state 'season' and 'episode' 
                    // But for TV shows, the player might send them too in data.data.season/episode if supported
                    // For now, relying on our state is safer for the active view
                    updateHistory(season, episode, currentTime, duration);
                }
            }
        } catch (err) {
            console.error("Error processing player message", err);
        }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id, season, episode]); // updateHistory is now stable via useCallback

  useEffect(() => {
    if (mediaType === 'tv' && id) {
      async function fetchTvDetails() {
        try {
          const res = await axios.get(requests.getTvDetails(id!));
          setTvDetails(res.data);
        } catch (err) {
          console.error("Failed to fetch TV details", err);
        }
      }
      fetchTvDetails();
    }
  }, [mediaType, id]);

  const getSrc = React.useMemo(() => {
    const baseUrl = 'https://www.vidking.net/embed';
    const history = id ? getWatchHistory(id) : undefined;
    
    // Build URL parameters for Vidking player
    const params = new URLSearchParams();
    
    // Brand color (Netflix red)
    params.append('color', 'e50914');
    
    // Auto-play feature
    params.append('autoPlay', 'true');
    
    // TV-specific features
    if (mediaType === 'tv') {
      params.append('nextEpisode', 'true');
      params.append('episodeSelector', 'true');
    }
    
    // Resume from last position (correct parameter name: progress, not start)
    // Only resume if timestamp > 10s and not near the end (heuristic)
    if (history?.timestamp && history.timestamp > 10 && (!history.duration || history.timestamp < history.duration * 0.95)) {
      params.append('progress', Math.floor(history.timestamp).toString());
    }

    const queryString = params.toString();
    const separator = queryString ? '?' : '';

    if (mediaType === 'movie') {
      return `${baseUrl}/movie/${id}${separator}${queryString}`;
    }
    return `${baseUrl}/tv/${id}/${season}/${episode}${separator}${queryString}`;
  }, [id, season, episode, mediaType, getWatchHistory]);

  // ... (render)

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex flex-col">
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

      {/* Back Button - Fixed Top Left */}
      <div className="fixed top-4 left-4 z-[100]">
        <button 
          onClick={() => navigate(-1)}
          className="text-white hover:text-gray-300 transition bg-black/50 backdrop-blur-sm rounded-full p-2 hover:bg-black/70"
        >
          <ArrowLeft className="w-8 h-8" />
        </button>
      </div>

      {/* TV Controls (Season/Episode) - Fixed Bottom Right */}
      {mediaType === 'tv' && tvDetails && (
         <div className="fixed bottom-10 right-10 z-[100] bg-[#141414]/95 p-4 rounded-lg border border-gray-700 backdrop-blur-sm">
             <div className="flex flex-col space-y-2">
                <label className="text-xs text-gray-400 uppercase font-bold">Season</label>
                <select 
                    value={season}
                    onChange={(e) => {
                        const newSeason = Number(e.target.value);
                        setSeason(newSeason);
                        setEpisode(1); // Reset episode when season changes
                        updateHistory(newSeason, 1);
                    }}
                    className="bg-[#333] text-white p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                    {tvDetails.seasons.map(s => (
                        <option key={s.id} value={s.season_number}>
                            Season {s.season_number}
                        </option>
                    ))}
                </select>

                <label className="text-xs text-gray-400 uppercase font-bold mt-2">Episode</label>
                 <select 
                    value={episode}
                    onChange={(e) => {
                        const newEpisode = Number(e.target.value);
                        setEpisode(newEpisode);
                        updateHistory(season, newEpisode);
                    }}
                     className="bg-[#333] text-white p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                    {/* Heuristic: allow up to 50 episodes selection */}
                    {Array.from({length: 50}, (_, i) => i + 1).map(num => (
                         <option key={num} value={num}>Episode {num}</option>
                    ))}
                </select>
             </div>
         </div>
      )}

      {/* Protected Vidking Player */}
      <div className="flex-1 w-full h-full relative">
        <ProtectedIframe
          src={getSrc}
          title={mediaType === 'tv' && tvDetails ? `${tvDetails.name} - S${season} E${episode}` : 'Movie'}
        />
      </div>
    </div>
  );
};

export default Watch;
