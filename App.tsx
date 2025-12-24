import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Search from './pages/Search';
import MyList from './pages/MyList';
import Browse from './pages/Browse';
import MoreInfoModal from './components/MoreInfoModal';

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
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
          <Route path="/tv-shows" element={<PageWrapper><Browse category="tv" /></PageWrapper>} />
          <Route path="/movies" element={<PageWrapper><Browse category="movie" /></PageWrapper>} />
          <Route path="/new-popular" element={<PageWrapper><Browse category="popular" /></PageWrapper>} />
          <Route path="/watch/:type/:id" element={<PageWrapper><Watch /></PageWrapper>} />
          <Route path="/search" element={<PageWrapper><Search /></PageWrapper>} />
          <Route path="/my-list" element={<PageWrapper><MyList /></PageWrapper>} />
        </Routes>
      </AnimatePresence>
      <MoreInfoModal />
    </div>
  );
};

export default App;
