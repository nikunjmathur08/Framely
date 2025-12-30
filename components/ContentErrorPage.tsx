import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface ContentErrorPageProps {
  errorMessage?: string;
}

const ContentErrorPage: React.FC<ContentErrorPageProps> = ({ 
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
      <div className="max-w-3xl w-full text-center space-y-8">
        {/* Error Message */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-4"
        >
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-tight">
            Pardon the interruption
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mx-auto">
            {errorMessage}
          </p>
        </motion.div>

        {/* VPN Suggestion Box */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="border-2 border-framely-red rounded-xl p-6 md:p-8 backdrop-blur-sm"
        >
          <div className="flex items-start gap-4">
            <div className="text-left space-y-2">
              <h3 className="text-xl font-semibold text-white">Try Using a VPN</h3>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                This content might be blocked by your ISP. Using a VPN can help you access ISP-restricted content by connecting through a different location.
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
          <button
            onClick={() => window.location.reload()}
            className="group relative px-12 py-4 bg-framely-gray text-black font-bold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(229,229,229,0.4)] w-full sm:w-auto cursor-pointer"
          >
            <span className="flex items-center justify-center gap-2">
              Try Again
            </span>
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="group px-12 py-4 bg-white/30 text-white font-bold rounded-lg hover:border-white/40 hover:scale-105 transition-all duration-300 backdrop-blur-sm w-full sm:w-auto cursor-pointer"
          >
            <span className="flex items-center justify-center gap-2">
              Go Home
            </span>
          </button>
        </motion.div>

        {/* Additional Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-4 text-xs text-gray-400 inline-block border-l-2 border-framely-red pl-2 py-2"
        >
          Error Code: CONTENT_UNAVAILABLE
        </motion.p>
      </div>
    </motion.div>
  );
};

export default ContentErrorPage;
