import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ProtectedIframe from '../components/ProtectedIframe';
import { useAppStore } from '../store/useAppStore';

interface ChannelInfo {
  channelName: string;
  slug?: string;
  logoUrl: string | null;
}

const WatchLive: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!id) return;
    try {
      const stored = sessionStorage.getItem(`live-channel-${id}`);
      if (stored) setChannelInfo(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [id]);

  const channelFromStore = useAppStore((s) => s.liveChannels.find((c) => c.id === id));
  const channelSlug = channelFromStore?.slug || channelInfo?.slug;
  const channelPageUrl = channelSlug
    ? `https://cinevid.st/channels/${channelSlug}`
    : `https://cinevid.st/player.html?id=${id}`;

  const playerUrl = channelPageUrl;
  const iframeUrl = `/api/proxy?url=${encodeURIComponent(playerUrl)}`;
  const displayName = channelInfo?.channelName || channelFromStore?.channelName || `Channel ${id}`;

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white flex flex-col overflow-x-clip">

      {/* Header — matches Watch.tsx style */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/live-tv')}
          className="text-white hover:text-gray-300 transition bg-white/10 backdrop-blur-md rounded-full p-2 hover:bg-white/20"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-red-500 uppercase">Live</span>
          </div>
        </div>
      </div>

      {/* Player — same sizing as Watch.tsx */}
      <div className="w-full max-w-6xl mx-auto aspect-video bg-black relative shadow-2xl overflow-hidden md:mt-4 md:rounded-2xl">
        <ProtectedIframe
          src={iframeUrl}
          title={displayName}
        />
      </div>

      {/* Info Section — matches Watch.tsx style */}
      <div className="max-w-8xl mx-auto w-full p-6 md:p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Logo if available */}
          {channelInfo?.logoUrl && !imgError && (
            <div className="flex-shrink-0 w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center p-2 border border-white/10">
              <img
                src={channelInfo.logoUrl}
                alt={displayName}
                onError={() => setImgError(true)}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-2xl md:text-5xl font-bold">{displayName}</h1>
          </div>
        </div>

        <p className="text-gray-500 text-xs leading-relaxed max-w-2xl">
          This is a live broadcast. Content may vary. If the stream is unavailable, try the{' '}
          <a
            href={playerUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-white underline underline-offset-2 hover:text-gray-300 transition"
          >
            external player
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default WatchLive;
