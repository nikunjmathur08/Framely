import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Row from '../components/Row';
import { useAppStore } from '../store/useAppStore';
import { useSeo } from '../hooks/useSeo';

const Anime: React.FC = () => {
  const catalog = useAppStore((state) => state.animeCatalog);
  const loading = useAppStore((state) => state.animeCatalogLoading);
  const error = useAppStore((state) => state.animeCatalogError);

  useSeo({
    title: 'Anime',
    description: 'Explore trending, top-rated, and animated movies on Framely.',
    type: 'website',
  });

  useEffect(() => {
    useAppStore.getState().fetchAnimeCatalog();
  }, []);

  const hasResults = catalog.trending.length + catalog.topRated.length + catalog.movies.length > 0;

  return (
    <div
      className="relative min-h-screen bg-[#141414]"
      style={{
        backgroundImage: 'linear-gradient(to bottom, rgba(80,10,10,0.45) 0px, rgba(20,20,20,1) 500px)',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Navbar />

      <main className="relative z-10 pt-24 md:pt-32 pb-24">

        {error && (
          <div className="mx-4 md:mx-14 mb-6 rounded-lg border border-red-500/40 bg-red-900/20 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {(loading || catalog.trending.length > 0) && (
          <Row title="Trending Anime" movies={catalog.trending} loading={loading} isLargeRow watchPathPrefix="/watch/anime" />
        )}
        {(loading || catalog.topRated.length > 0) && (
          <Row title="Top Rated Anime" movies={catalog.topRated} loading={loading} isLargeRow watchPathPrefix="/watch/anime" />
        )}
        {(loading || catalog.movies.length > 0) && (
          <Row title="Anime Movies" movies={catalog.movies} loading={loading} isLargeRow watchPathPrefix="/watch/anime" />
        )}

        {!loading && !error && !hasResults && (
          <div className="py-32 text-center text-gray-500">No anime titles are available right now.</div>
        )}
      </main>
    </div>
  );
};

export default Anime;
