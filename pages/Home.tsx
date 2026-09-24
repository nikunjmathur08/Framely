import React, { useEffect, useCallback, useMemo } from "react";
import Navbar from "../components/Navbar";
import Banner from "../components/Banner";
import Row from "../components/Row";
import ContinueWatchingRow from "../components/ContinueWatchingRow";
import ContentErrorPage from "../components/ContentErrorPage";
import WhatsNewModal from "../components/WhatsNewModal";
import { useMovieData } from "../hooks/useMovieData";
import { useContinueWatching } from "../hooks/useContinueWatching";
import { useAppStore } from "../store/useAppStore";
import { useSeo } from "../hooks/useSeo";

const Home: React.FC = () => {
  const { data, loading, error } = useMovieData();

  // SEO for Home page
  useSeo({
    title: undefined, // Uses default title
    description: 'Watch unlimited movies and TV shows on Framely. Stream trending content, top-rated movies, action thrillers and more.',
    type: 'website',
  });

  // Trigger fetch on mount - will use cache if fresh, or refresh if stale
  const fetchData = useCallback(() => {
    useAppStore.getState().fetchMovieData(true); // Force refresh
  }, []);

  useEffect(() => {
    useAppStore.getState().fetchMovieData();
  }, []);

  // Get My List and Continue Watching
  const myList = useAppStore((state) => state.myList);
  const removeFromWatchHistory = useAppStore((state) => state.removeFromWatchHistory);
  
  // Select a random movie for the banner from the first 6 trending items.
  // Only the first ITEMS_TO_ENRICH (6) items per category are enriched with
  // images.logos by the backend — so we must not pick beyond that slice.
  const bannerMovie = useMemo(() => {
    const enrichedSlice = data.trending.slice(0, 6);
    return enrichedSlice.length > 0
      ? enrichedSlice[Math.floor(Math.random() * enrichedSlice.length)]
      : null;
  }, [data.trending]);

  // Combine all movies for continue watching lookup
  const allMovies = useMemo(() => [
    ...data.trending,
    ...data.topRated,
    ...data.action,
    ...data.comedy,
    ...data.horror,
    ...data.romance,
    ...data.documentaries,
    ...data.upcoming,
    ...data.hindi,
    ...myList,
  ], [data, myList]);
  
  const continueWatchingItems = useContinueWatching(allMovies);

  const handleRemoveFromContinueWatching = useCallback((id: string) => {
    removeFromWatchHistory(id);
  }, [removeFromWatchHistory]);

  // Check if we have any data - computed AFTER all hooks
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

  return (
    <div className="relative min-h-screen bg-[#141414]">
      {/* Netflix-style top gradient — starts at top of page (shows through transparent navbar),
          fades warm maroon → dark by the time content rows appear */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[80vh]"
        style={{ background: 'linear-gradient(to bottom, #1f0b0b 0%, #1a0909 12%, #160808 25%, #141414 60%)' }}
      />
      <WhatsNewModal />
      <Navbar />
      <main className="relative z-10 mb-24">
        {/* Hero banner — self-contained block, rows sit below it (Netflix layout) */}
        <Banner movie={bannerMovie} loading={loading} />

        {/* Content rows — start cleanly below the banner with no overlap */}
        <section className="relative z-20 space-y-2 pt-6 pb-8" style={{ overflowX: 'clip' }}>
          {/* Watch It Again / Continue Watching - shown first if user has items */}
          {continueWatchingItems.length > 0 && (
            <ContinueWatchingRow
              items={continueWatchingItems}
              onRemove={handleRemoveFromContinueWatching}
            />
          )}
          
          <Row title="Trending Now" movies={data.trending} loading={loading} />
          {myList.length > 0 && (
            <Row title="My List" movies={myList} loading={false} />
          )}
          <Row title="Upcoming Movies & Shows" movies={data.upcoming} loading={loading} />
          <Row title="Top Rated" movies={data.topRated} loading={loading} />
          <Row title="Popular in India" movies={data.hindi} loading={loading} />
          <Row title="Action Thrillers" movies={data.action} loading={loading} />
          <Row title="Scary Movies" movies={data.horror} loading={loading} />
        </section>
      </main>
    </div>
  );
};

export default Home;
