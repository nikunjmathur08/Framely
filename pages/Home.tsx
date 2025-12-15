import React, { useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import Banner from "../components/Banner";
import Row from "../components/Row";
import { useMovieData } from "../hooks/useMovieData";
import { useAppStore } from "../store/useAppStore";

const Home: React.FC = () => {
  const { data, loading } = useMovieData();

  // Trigger fetch on mount - will use cache if fresh, or refresh if stale
  // Note: fetchMovieData is stable from the store, no dependencies needed
  useEffect(() => {
    useAppStore.getState().fetchMovieData();
  }, []); // Empty deps - only run once on mount

  // Select a random movie for the banner from trending
  const bannerMovie =
    data.trending.length > 0
      ? data.trending[Math.floor(Math.random() * data.trending.length)]
      : null;

  return (
    <div className="relative min-h-screen bg-[#141414]">
      <Navbar />
      <main className="relative mb-24 pb-8 lg:space-y-6">
        <Banner movie={bannerMovie} loading={loading} />
        <section className="space-y-0 relative z-20">
          <Row title="Trending Now" movies={data.trending} loading={loading} />
          <Row title="Top Rated" movies={data.topRated} loading={loading} />
          <Row title="Action Thrillers" movies={data.action} loading={loading}
          />
          <Row title="Comedies" movies={data.comedy} loading={loading} />
          <Row title="Scary Movies" movies={data.horror} loading={loading} />
          <Row title="Romance Movies" movies={data.romance} loading={loading} />
          <Row title="Documentaries" movies={data.documentaries} loading={loading}
          />
        </section>
      </main>
    </div>
  );
};

export default Home;
