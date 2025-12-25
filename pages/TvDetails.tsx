import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Plus, Check, Star, Calendar, ArrowLeft } from 'lucide-react';
import axios, { requests, getImageUrl, TMDB_GENRES } from '../services/tmdb';
import { TvShowDetails, Movie } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useSeo } from '../hooks/useSeo';
import { logger } from '../utils/logger';
import { 
  generateTvSchema, 
  generateBreadcrumbs, 
  getFullImageUrl, 
  generateSlug,
  extractKeywords 
} from '../utils/seoHelpers';
import { SEO_CONFIG } from '../constants';
import Navbar from '../components/Navbar';
import Skeleton from '../components/Skeleton';

/**
 * SEO-optimized TV Show Details Page
 * URL format: /tv/:id/:slug?
 * 
 * Features:
 * - Dynamic metadata (title, description, OG tags)
 * - JSON-LD structured data (TVSeries schema)
 * - Breadcrumb navigation
 * - Season information
 * - Internal linking to related shows
 */
const TvDetails: React.FC = () => {
  const { id, slug } = useParams<{ id: string; slug?: string }>();
  const navigate = useNavigate();
  const [show, setShow] = useState<TvShowDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  
  const { addToList, removeFromList, isInList } = useAppStore();

  // Fetch TV show details
  useEffect(() => {
    if (!id) return;
    
    const fetchShow = async () => {
      setLoading(true);
      try {
        const response = await axios.get(requests.getTvDetails(id));
        const showData = response.data;
        setShow(showData);
        
        // If the URL doesn't have a slug or has wrong slug, redirect to correct URL
        const correctSlug = generateSlug(showData.name || showData.title || '');
        if (correctSlug && slug !== correctSlug) {
          navigate(`/tv/${id}/${correctSlug}`, { replace: true });
        }

        // Get recommendations
        if (showData.recommendations?.results) {
          setRecommendations(showData.recommendations.results.slice(0, 12));
        }
      } catch (error) {
        logger.error('Failed to fetch TV show details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShow();
  }, [id, slug, navigate]);

  // Generate SEO data
  const seoData = React.useMemo(() => {
    if (!show) return {};
    
    const title = show.name || show.title || 'TV Show';
    const genres = show.genres?.map(g => g.name) || 
                   show.genre_ids?.map(id => TMDB_GENRES[id]).filter(Boolean) || [];
    
    return {
      title: `Watch ${title} Online - All Seasons`,
      description: show.overview || `Stream ${title} on Framely. ${show.number_of_seasons || 0} seasons, ${show.number_of_episodes || 0} episodes. ${genres.slice(0, 3).join(', ')} TV series.`,
      image: getFullImageUrl(show.backdrop_path || show.poster_path, 'backdrop', 'large'),
      type: 'video.tv_show' as const,
      url: `${SEO_CONFIG.baseUrl}/tv/${id}/${generateSlug(title)}`,
      canonicalUrl: `${SEO_CONFIG.baseUrl}/tv/${id}/${generateSlug(title)}`,
      keywords: extractKeywords(show, genres),
      jsonLd: [
        generateTvSchema(show),
        generateBreadcrumbs([
          { name: 'Home', url: SEO_CONFIG.baseUrl },
          { name: 'TV Shows', url: `${SEO_CONFIG.baseUrl}/tv-shows` },
          { name: title, url: `${SEO_CONFIG.baseUrl}/tv/${id}/${generateSlug(title)}` },
        ]),
      ],
    };
  }, [show, id]);

  // Apply SEO
  useSeo(seoData);

  const inList = show ? isInList(show.id) : false;
  const releaseYear = show?.first_air_date?.split('-')[0];
  const rating = show?.vote_average?.toFixed(1);
  const genres = show?.genres?.map(g => g.name) || 
                 show?.genre_ids?.map(id => TMDB_GENRES[id]).filter(Boolean) || [];
  const cast = show?.credits?.cast?.slice(0, 5).map(c => c.name).join(', ');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414]">
        <Navbar />
        <div className="pt-20 px-4 md:px-10">
          <Skeleton className="w-full h-[60vh] rounded-lg" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">TV Show not found</h1>
          <Link to="/" className="text-framely-red hover:underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative w-full h-[70vh] overflow-hidden"
      >
        {/* Backdrop Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${getImageUrl(show.backdrop_path || show.poster_path, 'original')})` 
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-transparent to-transparent" />
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-24 left-4 md:left-10 z-10 text-white hover:text-gray-300 transition bg-white/10 backdrop-blur-md rounded-full p-2 hover:bg-white/20"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          {/* Breadcrumb Navigation */}
          <nav className="text-sm text-gray-400 mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li><Link to="/" className="hover:text-white transition">Home</Link></li>
              <li>/</li>
              <li><Link to="/tv-shows" className="hover:text-white transition">TV Shows</Link></li>
              <li>/</li>
              <li className="text-white">{show.name || show.title}</li>
            </ol>
          </nav>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            {show.name || show.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-gray-300 mb-6">
            {rating && (
              <div className="flex items-center text-green-500 font-semibold">
                <Star className="w-4 h-4 fill-current mr-1" />
                {rating}
              </div>
            )}
            {releaseYear && (
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {releaseYear}
              </div>
            )}
            {show.number_of_seasons && (
              <div>{show.number_of_seasons} Seasons</div>
            )}
            {show.number_of_episodes && (
              <div>{show.number_of_episodes} Episodes</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {genres.slice(0, 4).map((genre, idx) => (
              <span key={idx} className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white">
                {genre}
              </span>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <Link 
              to={`/watch/tv/${show.id}`}
              className="flex items-center gap-2 px-8 py-3 bg-white text-black font-bold rounded-md hover:bg-gray-200 transition"
            >
              <Play className="w-5 h-5 fill-current" />
              Play
            </Link>
            <button
              onClick={() => inList ? removeFromList(show.id) : addToList(show)}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-md hover:bg-white/30 transition"
            >
              {inList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {inList ? 'In My List' : 'Add to List'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Details Section */}
      <div className="px-4 md:px-10 py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4">Overview</h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-8">
              {show.overview || 'No overview available.'}
            </p>

            {cast && (
              <div className="mb-6">
                <span className="text-gray-400 font-semibold">Cast: </span>
                <span className="text-gray-300">{cast}</span>
              </div>
            )}

            {/* Seasons List */}
            {show.seasons && show.seasons.length > 0 && (
              <section className="mt-8">
                <h2 className="text-xl font-semibold text-white mb-4">Seasons</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {show.seasons
                    .filter(s => s.season_number > 0)
                    .map((season) => (
                    <Link
                      key={season.id}
                      to={`/watch/tv/${show.id}?season=${season.season_number}`}
                      className="group bg-white/5 rounded-lg overflow-hidden hover:bg-white/10 transition"
                    >
                      {season.poster_path && (
                        <img
                          src={getImageUrl(season.poster_path, 'w500')}
                          alt={season.name}
                          className="w-full aspect-[2/3] object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="p-3">
                        <h3 className="text-white font-medium text-sm">{season.name}</h3>
                        <p className="text-gray-400 text-xs">{season.episode_count} Episodes</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">Show Info</h3>
              
              {show.first_air_date && (
                <div>
                  <span className="text-gray-400 text-sm">First Aired</span>
                  <p className="text-white">{new Date(show.first_air_date).toLocaleDateString()}</p>
                </div>
              )}
              
              {show.number_of_seasons && (
                <div>
                  <span className="text-gray-400 text-sm">Seasons</span>
                  <p className="text-white">{show.number_of_seasons}</p>
                </div>
              )}
              
              {show.number_of_episodes && (
                <div>
                  <span className="text-gray-400 text-sm">Episodes</span>
                  <p className="text-white">{show.number_of_episodes}</p>
                </div>
              )}
              
              {genres.length > 0 && (
                <div>
                  <span className="text-gray-400 text-sm">Genres</span>
                  <p className="text-white">{genres.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="mt-12" aria-labelledby="recommendations-heading">
            <h2 id="recommendations-heading" className="text-2xl font-bold text-white mb-6">
              Similar Shows
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recommendations.map((rec) => (
                <Link
                  key={rec.id}
                  to={`/tv/${rec.id}/${generateSlug(rec.name || rec.title || '')}`}
                  className="group"
                >
                  <article className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                    <img
                      src={getImageUrl(rec.poster_path, 'w500')}
                      alt={rec.name || rec.title || 'TV show poster'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  </article>
                  <h3 className="mt-2 text-sm text-white font-medium line-clamp-1">
                    {rec.name || rec.title}
                  </h3>
                  {rec.vote_average > 0 && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                      {rec.vote_average.toFixed(1)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default TvDetails;
