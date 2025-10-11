import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CurrentLocationIcon } from './icons/CurrentLocationIcon';

const searchSchema = z.object({
  location: z.string().min(2, 'Location must be at least 2 characters').max(200, 'Location is too long'),
});

type SearchFormData = z.infer<typeof searchSchema>;

interface SearchFormProps {
  onSearch: (location: string) => void;
  isLoading: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading }) => {
  const [isFetchingLocation, setIsFetchingLocation] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      location: '',
    },
  });

  const onSubmit = (data: SearchFormData) => {
    if (!isLoading && !isFetchingLocation) {
      onSearch(data.location.trim());
    }
  };

  const handleGetLocation = () => {
    if (!window.isSecureContext) {
      alert('Geolocation is only available on secure (HTTPS) connections.');
      return;
    }
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationString = `latitude: ${latitude}, longitude: ${longitude}`;
        onSearch(locationString);
        setValue('location', '');
        setIsFetchingLocation(false);
      },
      (error) => {
        let message = 'Could not get your location. Please ensure location services are enabled for this site in your browser settings.';
        if (error.code === error.PERMISSION_DENIED) {
          message = "You denied the request for Geolocation.";
        }
        alert(message);
        console.error('Geolocation error:', error);
        setIsFetchingLocation(false);
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2 items-center bg-gray-800/50 backdrop-blur-sm p-2 sm:pr-3 rounded-full shadow-2xl focus-within:ring-2 focus-within:ring-blue-500 transition-all duration-300 border border-gray-700/50">
          <input
            type="text"
            {...register('location')}
            placeholder="Enter a city or region (e.g., 'Davis, California')"
            className="w-full flex-grow px-4 py-2 text-white bg-transparent border-0 outline-none focus:outline-none focus:ring-0 shadow-none placeholder-gray-400"
            disabled={isLoading || isFetchingLocation}
            aria-label="Search location"
            aria-invalid={errors.location ? 'true' : 'false'}
            aria-describedby={errors.location ? 'location-error' : undefined}
            style={{ border: 'none', boxShadow: 'none' }}
          />
          <button
            type="button"
            onClick={handleGetLocation}
            className="p-2 text-gray-400 hover:text-blue-400 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            disabled={isLoading || isFetchingLocation}
            aria-label="Use my current location"
            title="Use my current location"
          >
            {isFetchingLocation ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <CurrentLocationIcon className="w-5 h-5" />
            )}
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300"
            disabled={isLoading || isFetchingLocation}
          >
            {isLoading ? 'Searching...' : 'Find Events'}
          </button>
        </div>
        {errors.location && (
          <p id="location-error" className="text-red-400 text-sm px-4" role="alert">
            {errors.location.message}
          </p>
        )}
      </div>
    </form>
  );
};
