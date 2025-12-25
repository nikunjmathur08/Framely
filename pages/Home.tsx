import React, { useEffect, useCallback, useMemo } from "react";
import Navbar from "../components/Navbar";
import Banner from "../components/Banner";
import Row from "../components/Row";
import ContinueWatchingRow from "../components/ContinueWatchingRow";
import { useMovieData } from "../hooks/useMovieData";
import { useContinueWatching } from "../hooks/useContinueWatching";
import { useAppStore } from "../store/useAppStore";
import { useSeo } from "../hooks/useSeo";

const Home: React.FC = () => {
  const { data, loading } = useMovieData();

  // SEO for Home page
  useSeo({
    title: undefined, // Uses default title
    description: 'Watch unlimited movies and TV shows on Framely. Stream trending content, top-rated movies, action thrillers and more.',
    type: 'website',
  });

  // Trigger fetch on mount - will use cache if fresh, or refresh if stale
  useEffect(() => {
    useAppStore.getState().fetchMovieData();
  }, []);

  // Select a random movie for the banner from trending
  const bannerMovie = useMemo(() => {
    return data.trending.length > 0
      ? data.trending[Math.floor(Math.random() * data.trending.length)]
      : null;
  }, [data.trending.length]);

  // Get My List and Continue Watching
  const { myList, removeFromWatchHistory } = useAppStore();
  
  // Combine all movies for continue watching lookup
  const allMovies = useMemo(() => [
    ...data.trending,
    ...data.topRated,
    ...data.action,
    ...data.horror,
    ...data.upcoming,
    ...data.hindi,
    ...myList,
  ], [data, myList]);
  
  const continueWatchingItems = useContinueWatching(allMovies);

  const handleRemoveFromContinueWatching = (id: string) => {
    removeFromWatchHistory(id);
  };

  return (
    <div className="relative min-h-screen bg-[#141414]">
      <Navbar />
      <main className="relative mb-24 pb-8 lg:space-y-6">
        <Banner movie={bannerMovie} loading={loading} />
        <section className="space-y-0 relative z-20">
          {/* Continue Watching - shown first if user has items */}
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
          <Row title="Action Thrillers" movies={data.action} loading={loading}/>
          <Row title="Scary Movies" movies={data.horror} loading={loading} />
        </section>
      </main>
    </div>
  );
};

export default Home;
