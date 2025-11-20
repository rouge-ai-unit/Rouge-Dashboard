
import React from 'react';

export const InitialState: React.FC = () => {
  return (
    <div className="text-center mt-16 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <svg className="mx-auto h-12 w-12 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <h3 className="mt-2 text-xl font-medium text-gray-900 dark:text-white">Start Your Search</h3>
      <p className="mt-1 text-md text-gray-500 dark:text-gray-400">
        Enter a country or region to find AgTech universities.
      </p>
    </div>
  );
};
