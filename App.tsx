import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Search from './pages/Search';
import MyList from './pages/MyList';
import MoreInfoModal from './components/MoreInfoModal';

const App: React.FC = () => {
  return (
    <div className="app bg-[#141414] min-h-screen text-white overflow-x-hidden">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/watch/:type/:id" element={<Watch />} />
        <Route path="/search" element={<Search />} />
        <Route path="/my-list" element={<MyList />} />
      </Routes>
      <MoreInfoModal />
    </div>
  );
};

export default App;
