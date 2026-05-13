import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  LayoutPanelTop,
  Sparkles,
  ChevronRight,
} from "lucide-react";

// Bump this string whenever you ship new features — the modal will re-show for every user.
const WHATS_NEW_VERSION = "v1.2.0";
const STORAGE_KEY = "framely_whats_new_seen";

interface Feature {
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    title: "Smart Search with Live Suggestions",
    description:
      "Start typing in the search bar and instantly see matching titles with posters, year and type.",
  },
  {
    title: "Cast Section in Movie Details",
    description:
      "Open any title's detail view to see the full cast with profile photos, actor names and character names.",
  },
  {
    title: "Continue Watching: Easier Removal",
    description:
      "The remove (x) button is now always visible on mobile and has a larger hit area on all devices.",
  },
];

const WhatsNewModal: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't seen this version yet
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== WHATS_NEW_VERSION) {
      // Small delay so it doesn't fire before the page finishes painting
      const t = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, WHATS_NEW_VERSION);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-lg bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Red accent stripe at top */}
            <div className="h-1 w-full bg-gradient-to-r from-[#E50914] via-rose-500 to-orange-500" />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-bold text-lg leading-tight">
                      What's New
                    </h2>
                    <span className="text-[10px] font-semibold bg-white/20 text-[#e5e5e5] px-1.5 py-0.5 rounded-full border border-[#e5e5e5]/30">
                      {WHATS_NEW_VERSION}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Fresh improvements just landed on Framely
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 hover:cursor-pointer flex items-center justify-center transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-white/5" />

            {/* Feature list */}
            <ul className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {FEATURES.map((feature, i) => (
                <motion.li
                  key={feature.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.3 }}
                  className="flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-white mt-1.5" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium leading-snug">
                      {feature.title}
                    </p>
                    <p className="text-gray-400 text-xs leading-relaxed mt-0.5">
                      {feature.description}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>

            {/* Footer CTA */}
            <div className="px-6 pb-5 pt-3">
              <button
                onClick={handleDismiss}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 hover:cursor-pointer active:bg-gray-200 text-black font-semibold text-sm py-2.5 rounded-xl transition-colors"
              >
                Let's Go
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WhatsNewModal;
