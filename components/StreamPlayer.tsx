import React, { useState } from 'react';

interface StreamPlayerProps {
  id: string;
}

const StreamPlayer: React.FC<StreamPlayerProps> = ({ id }) => {
  const [error, setError] = useState(false);
  
  // Use VITE_STREAM_PROVIDER_URL or fallback
  const providerUrl = import.meta.env.VITE_STREAM_PROVIDER_URL || 'https://dlive.sx';
  const iframeUrl = `${providerUrl}/stream/stream-${id}.php`;

  if (error) {
    return (
      <div className="w-full aspect-video bg-gray-900 flex flex-col items-center justify-center rounded-lg border border-gray-800 p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Stream Unavailable</h3>
        <p className="text-gray-400 mb-6 max-w-md">
          The stream connection was refused or blocked by the provider's security policies. 
          You can try opening it directly in a new window.
        </p>
        <a 
          href={iframeUrl} 
          target="_blank" 
          rel="noopener noreferrer nofollow"
          className="bg-white hover:bg-gray-200 text-black font-semibold px-6 py-3 rounded-md transition"
        >
          Open Stream in New Window
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
      <iframe
        src={iframeUrl}
        className="absolute inset-0 w-full h-full border-0"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        onError={() => setError(true)}
        title={`Live Stream ${id}`}
      />
    </div>
  );
};

export default StreamPlayer;
