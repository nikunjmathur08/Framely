import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Banner from '../components/Banner';
import Row from '../components/Row';
import axios, { requests } from '../services/tmdb';
import { Movie } from '../types';
import { useSeo } from '../hooks/useSeo';

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
  action: Movie[]; // or "Action & Adventure" for TV
  comedy: Movie[];
  horror: Movie[]; // or Crime for TV
  romance: Movie[]; // or Drama for TV
  documentaries: Movie[]; // or Kids/Sci-Fi for TV
}

const Browse: React.FC<BrowseProps> = ({ category }) => {
  const [data, setData] = useState<CategoryData>({
    trending: [],
    topRated: [],
    action: [],
    comedy: [],
    horror: [],
    romance: [],
    documentaries: []
  });
  const [loading, setLoading] = useState(true);

  // SEO for Browse page based on category
  const seoConfig = SEO_BY_CATEGORY[category];
  useSeo({
    title: seoConfig.title,
    description: seoConfig.description,
    type: 'website',
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let reqs: any = {};
        
        if (category === 'tv') {
           const [trending, topRated, actionAdv, comedy, crime, drama, kids, sciFi] = await Promise.all([
             axios.get(requests.fetchTrendingTV),
             axios.get(requests.fetchTopRatedTV),
             axios.get(requests.fetchActionAdventureTV),
             axios.get(requests.fetchComedyTV),
             axios.get(requests.fetchCrimeTV),
             axios.get(requests.fetchDramaTV),
             axios.get(requests.fetchKidsTV),
             axios.get(requests.fetchSciFiFantasyTV)
           ]);
           
           reqs = {
             trending: trending.data.results,
             topRated: topRated.data.results,
             action: actionAdv.data.results,
             comedy: comedy.data.results,
             horror: crime.data.results, // Mapping Crime to this slot
             romance: drama.data.results, // Mapping Drama to this slot
             documentaries: sciFi.data.results // Mapping Sci-Fi to this slot
           };
        } else if (category === 'movie') {
           const [trending, topRated, action, comedy, horror, romance, docs] = await Promise.all([
             axios.get(requests.fetchTrendingMovies),
             axios.get(requests.fetchTopRated), // Reusing generic top rated for movies
             axios.get(requests.fetchActionMovies),
             axios.get(requests.fetchComedyMovies),
             axios.get(requests.fetchHorrorMovies),
             axios.get(requests.fetchRomanceMovies),
             axios.get(requests.fetchDocumentaries)
           ]);
           
           reqs = {
             trending: trending.data.results,
             topRated: topRated.data.results,
             action: action.data.results,
             comedy: comedy.data.results,
             horror: horror.data.results,
             romance: romance.data.results,
             documentaries: docs.data.results
           };

        } else if (category === 'popular') {
            // Mix of popular movies and TV
            const [popMovies, popTV, trendMovies, trendTV] = await Promise.all([
                axios.get(requests.fetchPopularMovies),
                axios.get(requests.fetchPopularTV),
                axios.get(requests.fetchTrendingMovies),
                axios.get(requests.fetchTrendingTV)
            ]);

            reqs = {
                trending: popMovies.data.results, // Featured Banner
                topRated: popTV.data.results,     // Popular TV
                action: trendMovies.data.results, // Trending Movies
                comedy: trendTV.data.results,     // Trending TV
                horror: [],
                romance: [],
                documentaries: []
            };
        }

        setData(reqs);
      } catch (error) {
        console.error("Error fetching browse data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category]);

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
