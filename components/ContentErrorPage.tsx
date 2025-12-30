import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, Home, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ContentErrorPageProps {
  onRetry?: () => void;
  errorMessage?: string;
}

const ContentErrorPage: React.FC<ContentErrorPageProps> = ({ 
  onRetry,
  errorMessage = "We're having trouble playing this content"
}) => {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen w-full bg-[#0a0a0a] text-white flex items-center justify-center p-6"
    >
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Error Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
          className="flex justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-[#e50914] blur-3xl opacity-20 rounded-full"></div>
            <div className="relative bg-gradient-to-br from-[#e50914] to-[#b00710] p-8 rounded-full">
              <WifiOff className="w-20 h-20 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </motion.div>

        {/* Error Message */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Content Unavailable
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-lg mx-auto">
            {errorMessage}
          </p>
        </motion.div>

        {/* VPN Suggestion Box */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#e50914]/20 rounded-2xl p-6 md:p-8 backdrop-blur-sm"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className="bg-[#e50914]/10 p-3 rounded-xl">
                <Shield className="w-6 h-6 text-[#e50914]" />
              </div>
            </div>
            <div className="text-left space-y-2">
              <h3 className="text-xl font-semibold text-white">Try Using a VPN</h3>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                This content might not be available in your region. Using a VPN service can help you access geo-restricted content by connecting through a different location.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
        >
          {onRetry && (
            <button
              onClick={onRetry}
              className="group relative px-8 py-4 bg-[#e50914] hover:bg-[#f40612] text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(229,9,20,0.4)] w-full sm:w-auto"
            >
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                Try Again
              </span>
            </button>
          )}
          
          <button
            onClick={() => navigate('/')}
            className="group px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 hover:border-white/40 transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
          >
            <span className="flex items-center justify-center gap-2">
              <Home className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              Go Home
            </span>
          </button>
        </motion.div>

        {/* Additional Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-xs text-gray-600 pt-4"
        >
          Error Code: CONTENT_UNAVAILABLE
        </motion.p>
      </div>
    </motion.div>
  );
};

export default ContentErrorPage;
