import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MoreInfoModal from './components/MoreInfoModal';
import Home from './pages/Home';
import Browse from './pages/Browse';

const Watch = lazy(() => import('./pages/Watch'));
const Search = lazy(() => import('./pages/Search'));
const MyList = lazy(() => import('./pages/MyList'));
const MovieDetails = lazy(() => import('./pages/MovieDetails'));
const TvDetails = lazy(() => import('./pages/TvDetails'));

// Loading fallback component
const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-[#141414] flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-framely-red border-t-transparent rounded-full animate-spin" />
  </div>
);

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

const App: React.FC = () => {
  const location = useLocation();

  return (
    <div className="app bg-[#141414] min-h-screen text-white overflow-x-hidden">
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Main navigation routes */}
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/tv-shows" element={<PageWrapper><Browse category="tv" /></PageWrapper>} />
            <Route path="/movies" element={<PageWrapper><Browse category="movie" /></PageWrapper>} />
            <Route path="/new-popular" element={<PageWrapper><Browse category="popular" /></PageWrapper>} />
            
            {/* SEO-friendly detail pages with slug support */}
            <Route path="/movie/:id" element={<PageWrapper><MovieDetails /></PageWrapper>} />
            <Route path="/movie/:id/:slug" element={<PageWrapper><MovieDetails /></PageWrapper>} />
            <Route path="/tv/:id" element={<PageWrapper><TvDetails /></PageWrapper>} />
            <Route path="/tv/:id/:slug" element={<PageWrapper><TvDetails /></PageWrapper>} />
            
            {/* Watch routes */}
            <Route path="/watch/:type/:id" element={<PageWrapper><Watch /></PageWrapper>} />
            
            {/* Utility routes */}
            <Route path="/search" element={<PageWrapper><Search /></PageWrapper>} />
            <Route path="/my-list" element={<PageWrapper><MyList /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      <MoreInfoModal />
    </div>
  );
};

export default App;
