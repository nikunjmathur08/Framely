import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
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

const NAV_LINKS = [
  { label: "Home", to: "/"},
  { label: "Shows", to: "/tv-shows"},
  { label: "Movies", to: "/movies"},
  { label: "New & Popular", to: "/new-popular"},
  { label: "My List", to: "/my-list"},
]

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
  const location = useLocation();

  // Scroll detection
  useEffect(() => {
    // Only blur the navbar once the user scrolls past the hero section (~80vh)
    const handleScroll = () => setIsScrolled(window.scrollY > (window.innerHeight * 0.8));
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

      let results: Suggestion[] = [];
      try {
        const res = await axios.get(
          `${backendUrl}/api/tmdb/search/multi?query=${encodeURIComponent(query)}&include_adult=false&page=1`
        );
        results = (res.data.results || []).filter(
          (r: any) => r.media_type === "movie" || r.media_type === "tv"
        );
      } catch {
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

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        isScrolled
          ? "bg-[#141414]/25 backdrop-blur-sm"
          : "bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-4 md:px-14">
        <div className="flex items-center space-x-6 md:space-x-8">
          <Link to="/" className="flex-shrink-0" aria-label="Framely Home">
            <img
                src="/framely_logo.png"
                alt="Framely"
                className="h-12 sm:h-16 md:h-20 object-contain cursor-pointer"
              />
        </Link>

          <nav className="hidden md:block" aria-label="Main navigation">
            <ul className="flex items-center gap-1 text-[15px] font-regular">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`px-4 py-2.5 rounded-full transition-all duration-150 ${
                      isActive(link.to)
                        ? "bg-[#7d7c7c]/70 text-white font-semibold"
                        : "text-[#e5e5e5] hover:text-white hover:bg-[#616060]/25"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-4 text-white">
          {/* Search with typeahead */}
          <div
            ref={searchContainerRef}
            className="relative"
          >
            <div
              className={`flex items-center gap-1 transition-all duration-300 ${
                showSearch ? "bg-black/80 border border-white/40 rounded px-2 py-1" : ""
              } p-1 transition-[background-color,border-color] duration-300`}
            >
              <form
                onSubmit={handleSearchSubmit}
                className={`flex items-center transition-[width] duration-300 ${
                  showSearch ? "w-36 sm:w-52 md:w-64" : "w-5 sm:w-6"
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
                  <Search className="w-[18px] h-[18px] cursor-pointer" />
                </button>
                <input
                  ref={searchInputRef}
                  type="text"
                  id="navbar-search-input"
                  className={`bg-transparent text-white text-sm border-none focus:ring-0 outline-none ml-2 w-full placeholder-gray-400 ${
                    showSearch ? "block" : "hidden"
                  }`}
                  placeholder="Titles, people, genres"
                  value={searchInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => {
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
                className="absolute top-full right-0 mt-1 w-80 sm:w-96 bg-[#141414]/98 backdrop-blur-md border border-white/10 rounded shadow-2xl overflow-hidden z-[200]"
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
                      const isActiveItem = idx === activeSuggestion;
                      const posterSrc = suggestion.poster_path || suggestion.backdrop_path;

                      return (
                        <li
                          key={suggestion.id}
                          role="option"
                          aria-selected={isActiveItem}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors group ${
                            isActiveItem
                              ? "bg-white/15"
                              : "hover:bg-white/10"
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
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
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="md:hidden bg-[#141414]/95 backdrop-blur-xl absolute top-full left-0 w-full p-4 flex flex-col space-y-4 text-center border-t border-white/[0.06]"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`transition-colors ${isActive(link.to) ? "text-white font-semibold" : "text-gray-300 hover:text-white"}`}
              >
                {link.label}
              </Link>
            ))}

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
