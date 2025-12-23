import React, { useRef, useState } from "react";
import { RowProps } from "../types";
import MovieCard from "./MovieCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Skeleton from "./Skeleton";

const Row: React.FC<RowProps> = ({
  title,
  movies,
  loading,
  isLargeRow = false,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isMoved, setIsMoved] = useState(false);
  
  // Safety check: ensure movies is always an array
  const safeMovies = movies || [];

  const handleClick = (direction: "left" | "right") => {
    setIsMoved(true);
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo =
        direction === "left"
          ? scrollLeft - clientWidth
          : scrollLeft + clientWidth;

      rowRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  return (
    <div className="h-fit px-2 sm:px-4 md:px-10 mb-6 sm:mb-8 -mt-20 md:-mt-24 first:-mt-10 md:first:-mt-12 group relative group-hover:z-50 pointer-events-none">
      <h2 className="w-auto cursor-pointer text-sm font-semibold text-[#e5e5e5] transition duration-200 hover:text-white sm:text-lg md:text-2xl mb-3 sm:mb-4 pointer-events-auto inline-block">
        {title}
      </h2>

      <div className="relative -ml-2 md:-ml-4">
        <ChevronLeft
          className={`absolute top-0 bottom-0 left-1 sm:left-2 z-40 m-auto h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 cursor-pointer opacity-0 transition hover:scale-125 group-hover:opacity-100 pointer-events-auto ${
            !isMoved && "hidden"
          }`}
          onClick={() => handleClick("left")}
        />
        <div
          ref={rowRef}
          className="flex items-center space-x-0.5 overflow-x-scroll scrollbar-hide md:space-x-4 px-2 md:px-4 pointer-events-none"
          style={{
            scrollBehavior: "smooth",
            overflowY: "visible",
            paddingTop: "120px",
            paddingBottom: "180px",
            marginTop: "-120px",
            marginBottom: "-180px",
          }}
        >
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="pointer-events-auto">
                  <Skeleton
                    className={`min-w-[180px] md:min-w-[260px] ${
                      isLargeRow ? "h-[280px]" : "h-[160px]"
                    }`}
                  />
                </div>
              ))
            : safeMovies.map((movie, index) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  isLargeRow={isLargeRow}
                  index={index}
                  total={safeMovies.length}
                />
              ))}
        </div>

        <ChevronRight
          className="absolute top-0 bottom-0 right-1 sm:right-2 z-40 m-auto h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 cursor-pointer opacity-0 transition hover:scale-125 group-hover:opacity-100 pointer-events-auto"
          onClick={() => handleClick("right")}
        />
      </div>
    </div>
  );
};

export default Row;
