import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Banner from '../components/Banner';
import Row from '../components/Row';
import ContentErrorPage from '../components/ContentErrorPage';
import axios from 'axios';
import { Movie } from '../types';
import { useSeo } from '../hooks/useSeo';
import { logger } from "../utils/logger";

interface BrowseProps {
  category: 'tv' | 'movie' | 'popular';
}

// SEO configuration per category
const SEO_BY_CATEGORY = {
  tv: {
    title: 'TV Shows',
    description: 'Browse and stream the best TV shows on Framely. Watch trending series, top-rated dramas, comedy, action, and more.',
  },
  movie: {
    title: 'Movies',
    description: 'Discover and watch the latest movies on Framely. Stream action thrillers, comedies, horror, romance, and documentaries.',
  },
  popular: {
    title: 'New & Popular',
    description: 'Explore the most popular movies and TV shows right now on Framely. Trending content updated daily.',
  },
};

interface CategoryData {
  trending: Movie[];
  topRated: Movie[];
  action: Movie[];
  comedy: Movie[];
  horror: Movie[];
  romance: Movie[];
  documentaries: Movie[];
}

const emptyData: CategoryData = {
  trending: [],
  topRated: [],
  action: [],
  comedy: [],
  horror: [],
  romance: [],
  documentaries: []
};

const Browse: React.FC<BrowseProps> = ({ category }) => {
  const [data, setData] = useState<CategoryData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // SEO for Browse page based on category
  const seoConfig = SEO_BY_CATEGORY[category];
  useSeo({
    title: seoConfig.title,
    description: seoConfig.description,
    type: 'website',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    
    try {
      // Use aggregated backend endpoints that return enriched data with logos
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 
                         (import.meta.env.PROD ? '' : 'http://localhost:3001');
      
      // Map category to API parameter
      const categoryParam = category === 'movie' ? 'movies' : category;
      
      // Use query param for Vercel (file-based routing)
      const endpoint = import.meta.env.PROD 
        ? `/api/browse?category=${categoryParam}`
        : `/api/browse/${categoryParam}`;
      
      const response = await axios.get(`${backendUrl}${endpoint}`, {
        timeout: 30000 // 30 second timeout
      });
      
      const responseData = response.data || {};
      
      // Check if response has any content
      const hasContent = 
        (responseData.trending?.length > 0) ||
        (responseData.topRated?.length > 0) ||
        (responseData.action?.length > 0);
      
      if (!hasContent) {
        logger.error("Browse data response is empty");
        setError(true);
        setData(emptyData);
        return;
      }
      
      setData({
        trending: responseData.trending || [],
        topRated: responseData.topRated || [],
        action: responseData.action || [],
        comedy: responseData.comedy || [],
        horror: responseData.horror || [],
        romance: responseData.romance || [],
        documentaries: responseData.documentaries || []
      });
    } catch (err: any) {
      logger.error("Error fetching browse data:", err.message);
      setError(true);
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Show error page if there's an error or if not loading and data is empty
  const hasNoData = !loading && 
    data.trending.length === 0 && 
    data.topRated.length === 0 && 
    data.action.length === 0;

  if (error || hasNoData) {
    return (
      <ContentErrorPage 
        errorMessage="Sorry we're having trouble with your request."
      />
    );
  }

  // Select a random movie for the banner
  const bannerMovie =
    data.trending.length > 0
      ? data.trending[Math.floor(Math.random() * data.trending.length)]
      : null;

  return (
    <div className="relative min-h-screen bg-[#141414] lg:h-[140vh] overflow-x-hidden">
      <Navbar />
      <main className="relative pb-8 lg:space-y-6">
        <Banner movie={bannerMovie} loading={loading} />
        
        <section className="space-y-0 relative z-20">
            {category === 'tv' && (
                <>
                    <Row title="Trending TV Shows" movies={data.trending} loading={loading} />
                    <Row title="Top Rated TV" movies={data.topRated} loading={loading} />
                    <Row title="Action & Adventure" movies={data.action} loading={loading} />
                    <Row title="Comedy" movies={data.comedy} loading={loading} />
                    <Row title="Crime Dramas" movies={data.horror} loading={loading} />
                    <Row title="Drama" movies={data.romance} loading={loading} />
                    <Row title="Sci-Fi & Fantasy" movies={data.documentaries} loading={loading} />
                </>
            )}

            {category === 'movie' && (
                <>
                    <Row title="Trending Movies" movies={data.trending} loading={loading} />
                    <Row title="Top Rated Movies" movies={data.topRated} loading={loading} />
                    <Row title="Action Thrillers" movies={data.action} loading={loading} />
                    <Row title="Comedies" movies={data.comedy} loading={loading} />
                    <Row title="Horror" movies={data.horror} loading={loading} />
                    <Row title="Romance" movies={data.romance} loading={loading} />
                    <Row title="Documentaries" movies={data.documentaries} loading={loading} />
                </>
            )}

            {category === 'popular' && (
                <>
                   <Row title="Popular Movies" movies={data.trending} loading={loading} />
                   <Row title="Popular TV Shows" movies={data.topRated} loading={loading} />
                   <Row title="Trending Movies" movies={data.action} loading={loading} />
                   <Row title="Trending TV Shows" movies={data.comedy} loading={loading} />
                </>
            )}
        </section>
      </main>
    </div>
  );
};

export default Browse;
