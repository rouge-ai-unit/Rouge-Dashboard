
import React from 'react';

export const NoResults: React.FC = () => {
  return (
    <div className="text-center mt-16 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 className="mt-2 text-xl font-medium text-gray-900 dark:text-white">No Results Found</h3>
      <p className="mt-1 text-md text-gray-500 dark:text-gray-400">
        We couldn't find any universities for that region. Please try a different search term.
      </p>
    </div>
  );
};
