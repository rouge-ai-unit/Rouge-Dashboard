import React, { useState } from 'react';

interface SearchFormProps {
  onSearch: (region: string) => void;
  isLoading: boolean;
}

// FIX: Correctly define the functional component and destructure its props.
export const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading }) => {
  const [region, setRegion] = useState('Thailand');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (region.trim()) {
      onSearch(region.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="text"
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        placeholder="Enter a region (e.g., Thailand, South East Asia)"
        className="flex-grow w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-shadow"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !region.trim()}
        className="flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
      >
        {isLoading ? (
            <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
            </>
        ) : (
            'Search'
        )}
      </button>
    </form>
  );
};
