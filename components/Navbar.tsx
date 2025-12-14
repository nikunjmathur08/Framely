import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, Menu, X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput)}`);
      setShowSearch(false);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        isScrolled
          ? "bg-[#141414]"
          : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-2 sm:px-4 py-3 sm:py-4 md:px-10">
        <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-8">
          <Link to="/">
            <img
              src="/framely_logo.png"
              alt="Framely"
              className="h-12 sm:h-16 md:h-20 object-contain cursor-pointer"
            />
          </Link>

          <ul className="hidden md:flex space-x-4 text-sm font-medium text-gray-300">
            <li className="hover:text-white cursor-pointer transition">Home</li>
            <li className="hover:text-white cursor-pointer transition">
              TV Shows
            </li>
            <li className="hover:text-white cursor-pointer transition">
              Movies
            </li>
            <li className="hover:text-white cursor-pointer transition">
              New & Popular
            </li>
            <li className="hover:text-white cursor-pointer transition">
              <Link to="/my-list">My List</Link>
            </li>
          </ul>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 text-white">
          <div
            className={`relative flex items-center ${
              showSearch ? "bg-black/80 border border-white" : ""
            } p-1`}
          >
            <form
              onSubmit={handleSearchSubmit}
              className={`flex items-center transition-all duration-300 ${
                showSearch ? "w-32 sm:w-48 md:w-64" : "w-5 sm:w-6"
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  if (!showSearch) {
                    e.preventDefault();
                    setShowSearch(true);
                  }
                }}
                className="focus:outline-none"
              >
                <Search className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer" />
              </button>
              <input
                type="text"
                className={`bg-transparent text-white text-sm border-none focus:ring-0 ml-2 w-full ${
                  showSearch ? "block" : "hidden"
                }`}
                placeholder="Titles, people, genres"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onBlur={() => !searchInput && setShowSearch(false)}
              />
            </form>
          </div>

          <Bell className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer hidden sm:block" />

          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-blue-600 cursor-pointer overflow-hidden hidden sm:block">
            <img
              src="https://picsum.photos/200"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#141414] absolute top-16 left-0 w-full p-4 flex flex-col space-y-4 text-center border-t border-gray-800">
          <Link
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white hover:text-gray-300"
          >
            Home
          </Link>
          <Link
            to="/my-list"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white hover:text-gray-300"
          >
            My List
          </Link>
          <span className="text-gray-400">TV Shows</span>
          <span className="text-gray-400">Movies</span>
        </div>
      )}
    </header>
  );
};

export default Navbar;
