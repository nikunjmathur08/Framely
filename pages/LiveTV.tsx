import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { Play, Search, Tv } from 'lucide-react';

interface Channel {
  id: string;
  channelName: string;
  logoUrl?: string;
}

const ChannelCard: React.FC<{ channel: Channel; onClick: () => void }> = ({ channel, onClick }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.button
      variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="group relative aspect-video rounded-lg overflow-hidden cursor-pointer bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all duration-150 text-left"
    >
      {/* Logo image if available */}
      {channel.logoUrl && !imgError ? (
        <>
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-3">
            <img
              src={channel.logoUrl}
              alt={channel.channelName}
              onError={() => setImgError(true)}
              className="max-h-full max-w-full object-contain drop-shadow-lg"
            />
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-white ml-0.5" />
            </div>
          </div>
        </>
      ) : (
        /* Fallback: no logo */
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 gap-1.5">
          <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition">
            <Play className="w-4 h-4 text-white ml-0.5" />
          </div>
          <p className="text-white text-[11px] font-medium text-center leading-tight line-clamp-2 px-1">
            {channel.channelName}
          </p>
        </div>
      )}

      {/* Channel name tooltip on hover (when logo is shown) */}
      {channel.logoUrl && !imgError && (
        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-[10px] font-medium text-center line-clamp-1">{channel.channelName}</p>
        </div>
      )}

      {/* LIVE badge */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-red-600/80 rounded-full px-1.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-[9px] font-bold text-white uppercase tracking-wide">Live</span>
      </div>
    </motion.button>
  );
};

const LiveTV: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL ||
          (import.meta.env.PROD ? '' : 'http://localhost:3001');
        const res = await fetch(`${backendUrl}/api/live-schedule`);
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Unexpected response');
        setChannels(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load channels');
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(c => c.channelName.toLowerCase().includes(q));
  }, [channels, searchQuery]);

  const handleChannelClick = (channel: Channel) => {
    // Store channel info in sessionStorage so the player page can display it
    sessionStorage.setItem(`live-channel-${channel.id}`, JSON.stringify({
      channelName: channel.channelName,
      logoUrl: channel.logoUrl || null,
    }));
    navigate(`/watch/live/${channel.id}`);
  };

  return (
    <div
      className="relative min-h-screen bg-[#141414]"
      style={{
        backgroundImage: 'linear-gradient(to bottom, rgba(80,10,10,0.45) 0px, rgba(20,20,20,1) 500px)',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Navbar />

      <main className="relative z-10 pt-24 md:pt-32 px-4 md:px-14 pb-24">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">Live TV</h1>
            {!loading && channels.length > 0 && (
              <span className="text-gray-500 text-sm">({filtered.length})</span>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search channels…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-full py-2 pl-9 pr-4 text-sm placeholder:text-gray-500 focus:outline-none focus:border-white/30 transition"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-4 mb-6 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {[...Array(24)].map((_, i) => (
              <div key={i} className="aspect-video bg-white/5 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.02 } } }}
          >
            {filtered.map(channel => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onClick={() => handleChannelClick(channel)}
              />
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-gray-600 gap-3">
            <Tv className="w-12 h-12 opacity-30" />
            <p className="text-base">
              {searchQuery ? `No channels matching "${searchQuery}"` : 'No channels available'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default LiveTV;
