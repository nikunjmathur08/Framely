import React, { useRef, useState } from "react";
import { RowProps } from "../types";
import MovieCard from "./MovieCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Skeleton from "./Skeleton";
import { motion } from "framer-motion";

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

  // Generate unique ID for accessibility
  const sectionId = `row-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: "spring", bounce: 0, duration: 0.5 }}
      className="h-fit px-4 md:px-14 mb-4 sm:mb-6 group relative pointer-events-none"
      aria-labelledby={sectionId}
    >
      <h2 
        id={sectionId}
        className="w-auto cursor-pointer text-[13px] sm:text-sm md:text-[25px] font-semibold text-[#e5e5e5] hover:text-white transition duration-200 mb-2 sm:mb-3 pointer-events-auto inline-flex items-center gap-1 group/title"
      >
        {title}
      </h2>

      <div className="relative -ml-1 md:-ml-2">
        <ChevronLeft
          className={`absolute top-0 bottom-0 left-0 z-40 m-auto h-8 w-8 md:h-10 md:w-10 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto bg-black/50 hover:bg-black/80 rounded-full p-1.5 ${
            !isMoved && "hidden"
          }`}
          onClick={() => handleClick("left")}
        />
        <div
          ref={rowRef}
          className="flex items-center space-x-1 md:space-x-2 overflow-x-scroll scrollbar-hide px-1 md:px-2 pointer-events-none"
          style={{
            scrollBehavior: "smooth",
            overflowY: "visible",
            paddingTop: "100px",
            paddingBottom: "160px",
            marginTop: "-100px",
            marginBottom: "-160px",
          }}
        >
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="pointer-events-auto">
                  <Skeleton
                    className={`min-w-[160px] md:min-w-[240px] ${
                      isLargeRow ? "h-[240px]" : "h-[90px] sm:h-[110px] md:h-[145px]"
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
                  rowKey={sectionId}
                />
              ))}
        </div>

        <ChevronRight
          className="absolute top-0 bottom-0 right-0 z-40 m-auto h-8 w-8 md:h-10 md:w-10 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto bg-black/50 hover:bg-black/80 rounded-full p-1.5"
          onClick={() => handleClick("right")}
        />
      </div>
    </motion.section>
  );
};

export default Row;
