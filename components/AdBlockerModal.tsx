import React, { useState, useEffect } from 'react';
import { X, Shield, Download, Check } from 'lucide-react';

interface AdBlockerModalProps {
  onClose: () => void;
  onDontShowAgain: () => void;
}

const AdBlockerModal: React.FC<AdBlockerModalProps> = ({ onClose, onDontShowAgain }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Detect user's browser to provide correct extension link
  const getBrowserType = (): 'chrome' | 'firefox' | 'edge' | 'safari' | 'other' => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('edg/')) return 'edge';
    if (userAgent.includes('chrome') && !userAgent.includes('edg/')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
    return 'other';
  };

  const browser = getBrowserType();

  // Extension store links
  const extensionLinks = {
    chrome: 'https://chrome.google.com/webstore/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh',
    firefox: 'https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/',
    edge: 'https://microsoftedge.microsoft.com/addons/detail/ublock-origin-lite/cimighlppcgcoapaliogpjjdehbnofhn',
    safari: 'https://apps.apple.com/us/app/adguard-for-safari/id1440147259', // Safari doesn't have uBlock, use AdGuard
    other: 'https://chrome.google.com/webstore/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh'
  };

  const handleClose = () => {
    if (dontShowAgain) {
      onDontShowAgain();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-[#141414] border border-white/5 rounded-lg shadow-2xl shadow-white-200/10 max-w-lg w-full mx-4 overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white">Better Viewing Experience</h2>
          </div>

          <p className="text-gray-300 mb-8 leading-relaxed">
            To avoid ads and pop-ups during video playback, we recommend using an ad blocker or switching to a browser with built-in protection.
          </p>

          <div className="space-y-4 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">UBlock Origin Lite</h3>
                  <p className="text-gray-400 text-sm mb-3">Free browser extension (recommended)</p>
                  <a
                    href={extensionLinks[browser]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block border-2 border-white/40 text-white/60 hover:text-black hover:bg-white/80 hover:text-black ease-in-out transition-all px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Install for {browser === 'chrome' ? 'Chrome' : browser === 'firefox' ? 'Firefox' : browser === 'edge' ? 'Edge' : browser === 'safari' ? 'Safari (AdGuard)' : 'Your Browser'}
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">Brave Browser</h3>
                  <p className="text-gray-400 text-sm mb-3">Built-in ad & tracker blocking</p>
                  <a
                    href="https://brave.com/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block border-2 border-white/40 text-white/60 hover:text-black hover:bg-white/80 hover:text-black ease-in-out transition-all px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Download Brave
                  </a>
                </div>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 mb-6 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={dontShowAgain || localStorage.getItem('adBlockerModalHidden') === 'true'}
                onChange={(e) => {
                  setDontShowAgain(e.target.checked);
                  localStorage.setItem('adBlockerModalHidden', e.target.checked ? 'true' : 'false');
                }}
                className="sr-only"
              />
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                  dontShowAgain || localStorage.getItem('adBlockerModalHidden') === 'true'
                    ? 'bg-white border-white'
                    : 'bg-transparent border-gray-600 group-hover:border-gray-500'
                }`}
              >
                {(dontShowAgain || localStorage.getItem('adBlockerModalHidden') === 'true') && (
                  <Check className="w-4 h-4 text-black" strokeWidth={3} />
                )}
              </div>
            </div>
            <span className="text-gray-300 text-base group-hover:text-white transition-colors select-none">
              Don't show this again
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default AdBlockerModal;
