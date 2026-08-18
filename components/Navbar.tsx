import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, Menu, X, ChevronRight, Film, Tv } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { getImageUrl } from "../services/tmdb";
import axios from "axios";

interface Suggestion {
  id: number;
  title?: string;
  name?: string;
  media_type: "movie" | "tv";
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
}

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const openMoreInfo = useAppStore((state) => state.openMoreInfo);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-focus input when search opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Click-outside handler to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
        if (!searchInput) setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchInput]);

  // Debounced typeahead fetch
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSuggestionsLoading(true);
    try {
      const backendUrl =
        import.meta.env.VITE_BACKEND_URL ||
        (import.meta.env.PROD ? "" : "http://localhost:3001");

      // Try backend proxy first, fall back to direct TMDB (frontend key)
      let results: Suggestion[] = [];
      try {
        const res = await axios.get(
          `${backendUrl}/api/tmdb/search/multi?query=${encodeURIComponent(query)}&include_adult=false&page=1`
        );
        results = (res.data.results || []).filter(
          (r: any) => r.media_type === "movie" || r.media_type === "tv"
        );
      } catch {
        // Fallback: direct TMDB call via frontend key
        const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
        if (TMDB_API_KEY) {
          const res = await axios.get(
            `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&page=1`
          );
          results = (res.data.results || []).filter(
            (r: any) => r.media_type === "movie" || r.media_type === "tv"
          );
        }
      }

      setSuggestions(results.slice(0, 6));
      setShowSuggestions(results.length > 0);
      setActiveSuggestion(-1);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    setActiveSuggestion(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const highlighted = activeSuggestion >= 0 ? suggestions[activeSuggestion] : null;
    if (highlighted) {
      handleSuggestionSelect(highlighted);
    } else if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
      setShowSearch(false);
      setShowSuggestions(false);
      setSearchInput("");
      setIsMobileMenuOpen(false);
    }
  };

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setShowSuggestions(false);
    setShowSearch(false);
    setSearchInput("");
    setSuggestions([]);
    // Navigate to the watch page
    navigate(`/watch/${suggestion.media_type}/${suggestion.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }
  };

  const getDisplayTitle = (s: Suggestion) => s.title || s.name || "Unknown";

  const getReleaseYear = (s: Suggestion) => {
    const date = s.release_date || s.first_air_date;
    return date ? new Date(date).getFullYear() : null;
  };

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-[background-color,backdrop-filter,border-color] duration-500 ${
        isScrolled
          ? "bg-[#141414]/80 backdrop-blur-xl saturate-150 border-b border-white/[0.06]"
          : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-4 md:px-12 py-3 sm:py-4">
        <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-8">
          <Link to="/">
            <img
              src="/framely_logo.png"
              alt="Framely"
              className="h-12 sm:h-16 md:h-20 object-contain cursor-pointer"
            />
          </Link>

          <ul className="hidden md:flex space-x-4 text-sm font-medium text-gray-300">
            <Link to="/"><li className="hover:text-white cursor-pointer transition">Home</li></Link>
            <Link to="/tv-shows"><li className="hover:text-white cursor-pointer transition">TV Shows</li></Link>
            <Link to="/movies"><li className="hover:text-white cursor-pointer transition">Movies</li></Link>
            <Link to="/new-popular"><li className="hover:text-white cursor-pointer transition">New &amp; Popular</li></Link>
            <Link to="/my-list"><li className="hover:text-white cursor-pointer transition">My List</li></Link>
          </ul>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 text-white">
          {/* Search with typeahead */}
          <div
            ref={searchContainerRef}
            className="relative"
          >
            <div
              className={`relative flex items-center ${
                showSearch ? "bg-black/80 border border-white/20 rounded-lg" : ""
              } p-1 transition-[background-color,border-color] duration-300`}
            >
              <form
                onSubmit={handleSearchSubmit}
                className={`flex items-center transition-[width] duration-300 ${
                  showSearch ? "w-40 sm:w-56 md:w-72" : "w-5 sm:w-6"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!showSearch) setShowSearch(true);
                  }}
                  className="focus:outline-none flex-shrink-0"
                  aria-label="Open search"
                >
                  <Search className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer" />
                </button>
                <input
                  ref={searchInputRef}
                  type="text"
                  id="navbar-search-input"
                  className={`bg-transparent text-white text-sm border-none focus:ring-0 outline-none ml-2 w-full ${
                    showSearch ? "block" : "hidden"
                  }`}
                  placeholder="Titles, people, genres"
                  value={searchInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    // Slight delay to allow click on suggestion to register
                    setTimeout(() => {
                      if (!searchInput) setShowSearch(false);
                    }, 150);
                  }}
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-controls="search-suggestions"
                  aria-expanded={showSuggestions}
                />
              </form>
            </div>

            {/* Suggestions Dropdown */}
            {showSearch && showSuggestions && (
              <div
                id="search-suggestions"
                role="listbox"
                className="absolute top-full right-0 mt-1 w-80 sm:w-96 bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl overflow-hidden z-[200]"
              >
                {suggestionsLoading ? (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="text-gray-400 text-sm">Searching…</span>
                  </div>
                ) : (
                  <ul>
                    {suggestions.map((suggestion, idx) => {
                      const title = getDisplayTitle(suggestion);
                      const year = getReleaseYear(suggestion);
                      const isActive = idx === activeSuggestion;
                      const posterSrc = suggestion.poster_path || suggestion.backdrop_path;

                      return (
                        <li
                          key={suggestion.id}
                          role="option"
                          aria-selected={isActive}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors group ${
                            isActive
                              ? "bg-white/15"
                              : "hover:bg-white/10"
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault(); // prevent blur firing before click
                            handleSuggestionSelect(suggestion);
                          }}
                          onMouseEnter={() => setActiveSuggestion(idx)}
                        >
                          {/* Poster thumbnail */}
                          <div className="flex-shrink-0 w-10 h-14 rounded overflow-hidden bg-gray-800">
                            {posterSrc ? (
                              <img
                                src={getImageUrl(posterSrc, "w500")}
                                alt={title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {suggestion.media_type === "tv" ? (
                                  <Tv className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <Film className="w-4 h-4 text-gray-500" />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium line-clamp-1 group-hover:text-white transition-colors">
                              {title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {year && (
                                <span className="text-gray-400 text-xs">{year}</span>
                              )}
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm uppercase tracking-wide ${
                                  suggestion.media_type === "tv"
                                    ? "bg-blue-900/60 text-blue-300"
                                    : "bg-red-900/60 text-red-300"
                                }`}
                              >
                                {suggestion.media_type === "tv" ? "Series" : "Movie"}
                              </span>
                              {suggestion.vote_average && suggestion.vote_average > 0 && (
                                <span className="text-[#46d369] text-xs font-semibold">
                                  {(suggestion.vote_average * 10).toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </li>
                      );
                    })}

                    {/* "See all results" footer */}
                    <li
                      className="flex items-center justify-center gap-2 px-4 py-2.5 border-t border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (searchInput.trim()) {
                          navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
                          setShowSearch(false);
                          setShowSuggestions(false);
                          setSearchInput("");
                        }
                      }}
                    >
                      <Search className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-400 text-xs">
                        See all results for <span className="text-white font-medium">"{searchInput}"</span>
                      </span>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>

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
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu — spring animated per Apple §1 (respond instantly, animate naturally) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="md:hidden bg-[#141414]/95 backdrop-blur-xl absolute top-full left-0 w-full p-4 flex flex-col space-y-4 text-center border-t border-white/[0.06]"
          >
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/my-list"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              My List
            </Link>
            <Link
              to="/tv-shows"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              TV Shows
            </Link>
            <Link
              to="/movies"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              Movies
            </Link>

            {/* Mobile search */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center bg-[#2a2a2a] rounded px-3 py-2 gap-2"
            >
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                className="bg-transparent text-white text-sm outline-none flex-1"
                placeholder="Search titles, people, genres"
                value={searchInput}
                onChange={handleInputChange}
                autoComplete="off"
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
