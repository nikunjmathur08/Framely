import React from 'react';
import Navbar from '../components/Navbar';
import { useAppStore } from '../store/useAppStore';
import MovieCard from '../components/MovieCard';

const MyList: React.FC = () => {
  const { myList } = useAppStore();

  return (
    <div className="relative h-screen bg-[#141414] pt-24">
      <Navbar />
      <div className="px-4 md:px-10">
        <h2 className="text-white text-2xl font-semibold mb-6">My List</h2>

        {myList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-y-8 gap-x-4 pb-10">
            {myList.map((movie) => (
              <div key={movie.id} className="transform hover:scale-105 transition duration-200">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
              <p className="text-xl">Your list is empty.</p>
              <p className="text-sm mt-2">Add shows and movies to your list to watch them later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyList;
