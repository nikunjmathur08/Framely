import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios, { requests } from '../services/tmdb';
import { TvShowDetails } from '../types';
import ProtectedIframe from '../components/ProtectedIframe';

const Watch: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [tvDetails, setTvDetails] = useState<TvShowDetails | null>(null);

  // Validating type for TypeScript safety in logic
  const mediaType = type === 'tv' ? 'tv' : 'movie';

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

  const getSrc = () => {
    const baseUrl = 'https://www.vidking.net/embed';
    if (mediaType === 'movie') {
      return `${baseUrl}/movie/${id}`;
    }
    return `${baseUrl}/tv/${id}/${season}/${episode}`;
  };

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex flex-col">
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
                        setSeason(Number(e.target.value));
                        setEpisode(1); // Reset episode when season changes
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
                    onChange={(e) => setEpisode(Number(e.target.value))}
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
          src={getSrc()}
          title={mediaType === 'tv' && tvDetails ? `${tvDetails.name} - S${season} E${episode}` : 'Movie'}
        />
      </div>
    </div>
  );
};

export default Watch;
