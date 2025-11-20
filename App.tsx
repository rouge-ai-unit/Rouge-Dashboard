import React, { useState, useCallback } from 'react';
import { SearchForm } from './components/SearchForm';
import { UniversityCard } from './components/UniversityCard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Disclaimer } from './components/Disclaimer';
import { fetchUniversities } from './services/geminiService';
import { University } from './types';
import { Header } from './components/Header';
import { InitialState } from './components/InitialState';
import { NoResults } from './components/NoResults';
import { ErrorDisplay } from './components/ErrorDisplay';

interface AppError {
  title: string;
  message: string;
}

const App: React.FC = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleSearch = useCallback(async (region: string) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setUniversities([]);

    try {
      const results = await fetchUniversities(region);
      setUniversities(results);
    } catch (err) {
      let message = 'An unknown error occurred. Please try again later.';
      let title = 'Search Failed';
      if (err instanceof Error) {
        const lowerCaseMessage = err.message.toLowerCase();
        if (lowerCaseMessage.includes('api key')) {
            title = 'API Key Error';
            message = 'Could not connect to the AI service. Please ensure your API key is configured correctly and try again.';
        } else {
            title = 'Invalid Region';
            message = `We couldn't get results for "${region}". The region may not be supported or the query may be too specific. Please try a broader search term (e.g., a country or continent).`;
        }
      }
      setError({ title, message });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }
    if (error) {
      return <ErrorDisplay title={error.title} message={error.message} />;
    }
    if (!hasSearched) {
        return <InitialState />;
    }
    if (universities.length > 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {universities.map((uni, index) => (
            <div
              key={index}
              className="fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <UniversityCard university={uni} />
            </div>
          ))}
        </div>
      );
    }
    if (hasSearched && universities.length === 0) {
        return <NoResults />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
      <div className="container mx-auto px-4 py-8">
        <Header />
        <main>
          <div className="max-w-3xl mx-auto mt-8">
            <SearchForm onSearch={handleSearch} isLoading={isLoading} />
            <Disclaimer />
          </div>
          <div className="mt-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
