import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import { Play, Search, Tv, ExternalLink, ShieldCheck, X } from 'lucide-react';
import { useAppStore, LiveChannel } from '../store/useAppStore';

const ChannelCard: React.FC<{ channel: LiveChannel; onClick: () => void }> = ({ channel, onClick }) => {
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

/* ── Redirect Modal ─────────────────────────────────────────────────────────── */
interface RedirectModalProps {
  channel: LiveChannel;
  onClose: () => void;
}

export const getCinevidChannelUrl = (channel: LiveChannel): string => {
  if (channel.slug) {
    return `https://cinevid.st/channels/${channel.slug}`;
  }
  const cleanName = channel.channelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const cleanCountry = channel.country ? channel.country.toLowerCase() : '';
  const fallbackSlug = cleanCountry && !cleanName.endsWith(cleanCountry)
    ? `${cleanName}-${cleanCountry}`
    : cleanName;

  return fallbackSlug
    ? `https://cinevid.st/channels/${fallbackSlug}`
    : `https://cinevid.st/player.html?id=${channel.id}`;
};

const RedirectModal: React.FC<RedirectModalProps> = ({ channel, onClose }) => {
  const [countdown, setCountdown] = useState(5);
  const targetUrl = getCinevidChannelUrl(channel);

  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = targetUrl;
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, targetUrl]);

  const handleRedirectNow = () => {
    window.location.href = targetUrl;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <ExternalLink className="w-7 h-7 text-red-500" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center mb-2">
          Opening External Player
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          You're being redirected to an external website to watch{' '}
          <span className="text-white font-medium">{channel.channelName}</span>.
        </p>

        {/* Adblocker tip */}
        <div className="border border-yellow-500/15 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <div>
              <p className="text-yellow-200/90 text-sm font-medium mb-1">Use an Adblocker</p>
              <p className="text-yellow-200/60 text-xs leading-relaxed">
                For the best experience, use an adblocker like{' '}
                <a
                  href="https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200 transition"
                >
                  uBlock Origin Lite
                </a>{' '}
                or the{' '}
                <a
                  href="https://brave.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200 transition"
                >
                  Brave browser
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleRedirectNow}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/20"
          >
            <ExternalLink className="w-4 h-4" />
            Redirect Now
            {countdown > 0 && (
              <span className="text-red-200 text-sm font-normal">({countdown}s)</span>
            )}
          </button>

          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm font-medium rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
          >
            Open in new tab instead
          </a>

          <button
            onClick={onClose}
            className="w-full py-2 text-gray-500 hover:text-gray-300 text-xs font-medium transition cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* URL preview */}
        <p className="text-gray-600 text-[10px] text-center mt-4 truncate">
          {targetUrl}
        </p>
      </motion.div>
    </motion.div>
  );
};

/* ── LiveTV Page ────────────────────────────────────────────────────────────── */
const LiveTV: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);

  const channels = useAppStore((s) => s.liveChannels);
  const loading = useAppStore((s) => s.liveChannelsLoading);
  const error = useAppStore((s) => s.liveChannelsError);

  // If the user lands directly on /live-tv without going through Home, fetch now
  useEffect(() => {
    useAppStore.getState().fetchLiveChannels();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(c => c.channelName.toLowerCase().includes(q));
  }, [channels, searchQuery]);

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
                onClick={() => setSelectedChannel(channel)}
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

      {/* Redirect Modal */}
      <AnimatePresence>
        {selectedChannel && (
          <RedirectModal
            channel={selectedChannel}
            onClose={() => setSelectedChannel(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveTV;
