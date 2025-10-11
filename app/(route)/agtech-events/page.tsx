'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SearchForm } from '@/components/agtech-event-finder/SearchForm';
import { EventCard } from '@/components/agtech-event-finder/EventCard';
import { LoadingSpinner } from '@/components/agtech-event-finder/LoadingSpinner';
import { SparklesIcon } from '@/components/agtech-event-finder/icons/SparklesIcon';
import { Filter, SlidersHorizontal, Download, Grid3x3, List, Calendar, DollarSign, MapPin } from 'lucide-react';
import type { AgTechEvent, AgTechEventSearchResponse, AgTechEventError } from '@/types/agtech-event-finder';

/**
 * AgTech Event Finder Page
 * AI-powered discovery of AgTech startup conventions, expos, and networking events
 * Enterprise-grade with filters, export, and comprehensive error handling
 */
export default function AgTechEventsPage() {
  // Set page title
  useEffect(() => {
    document.title = 'AgTech Event Finder | Rouge Dashboard';
  }, []);
  const [events, setEvents] = useState<AgTechEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  
  // Filter and display states
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'price'>('date');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  const handleSearch = async (location: string) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setEvents([]);
    setSelectedLocation(location);

    try {
      const response = await fetch('/api/agtech-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      });

      if (!response.ok) {
        const errorData: AgTechEventError = await response.json();
        
        if (response.status === 401) {
          setError('Please log in to search for events.');
        } else if (response.status === 429) {
          setError('Too many requests. Please wait a moment and try again.');
        } else {
          setError(errorData.details || 'Sorry, we encountered an error while finding events. Please try again.');
        }
        return;
      }

      const data: AgTechEventSearchResponse = await response.json();
      setEvents(data.events);

      // Track successful search
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'agtech_event_search', {
          event_category: 'AgTech Events',
          event_label: location,
          value: data.events.length,
        });
      }
      
    } catch (err) {
      setError('Sorry, we encountered an error while finding events. Please try again.');
      console.error('[AgTech Events] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = [...events];

    // Price filter
    if (priceFilter === 'free') {
      filtered = filtered.filter(event => event.price.toLowerCase() === 'free');
    } else if (priceFilter === 'paid') {
      filtered = filtered.filter(event => event.price.toLowerCase() !== 'free');
    }

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.eventName.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.eventName.localeCompare(b.eventName);
      } else if (sortBy === 'price') {
        const priceA = a.price.toLowerCase() === 'free' ? 0 : 999;
        const priceB = b.price.toLowerCase() === 'free' ? 0 : 999;
        return priceA - priceB;
      }
      // Default: sort by date (keep original order from API)
      return 0;
    });

    return filtered;
  }, [events, priceFilter, searchQuery, sortBy]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredAndSortedEvents.length === 0) return;

    const headers = ['Event Name', 'Date', 'Location', 'Price', 'Description', 'Registration Link'];
    const rows = filteredAndSortedEvents.map(event => [
      event.eventName,
      event.date,
      event.location,
      event.price,
      event.description.replace(/,/g, ';'), // Replace commas to avoid CSV issues
      event.registrationLink,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `agtech-events-${selectedLocation.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-10">
          <LoadingSpinner />
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Scouting for the best AgTech events...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-10 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          {error}
        </div>
      );
    }

    if (!hasSearched) {
      return (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          <p>Enter your location to discover AgTech events near you.</p>
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          <p>No events found for that location. Try a broader search area!</p>
        </div>
      );
    }

    if (filteredAndSortedEvents.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          <p>No events match your current filters. Try adjusting your search criteria.</p>
        </div>
      );
    }

    return (
      <div className={viewMode === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' 
        : 'flex flex-col gap-6'
      }>
        {filteredAndSortedEvents.map((event, index) => (
          <EventCard key={`${event.eventName}-${index}`} event={event} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 text-3xl md:text-4xl font-bold text-green-700 dark:text-green-400">
            <SparklesIcon />
            <h1>AgTech Event Finder</h1>
          </div>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your AI-powered guide to AgTech startup expos, conventions, and networking opportunities.
          </p>
        </header>
        
        <div className="max-w-2xl mx-auto mb-12">
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Filters and Controls */}
        {hasSearched && events.length > 0 && (
          <div className="mb-8 space-y-4">
            {/* Top Bar: Results count, view toggle, export */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{filteredAndSortedEvents.length}</span> of <span className="font-semibold">{events.length}</span> events
                  {selectedLocation && <span className="ml-1">in {selectedLocation}</span>}
                </p>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                  aria-label="Toggle filters"
                >
                  <SlidersHorizontal size={16} />
                  Filters
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    aria-label="Grid view"
                    title="Grid view"
                  >
                    <Grid3x3 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    aria-label="List view"
                    title="List view"
                  >
                    <List size={18} />
                  </button>
                </div>

                {/* Export Button */}
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                  aria-label="Export to CSV"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Filter size={20} />
                  Filter Events
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search Filter */}
                  <div>
                    <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Search Events
                    </label>
                    <input
                      id="search-filter"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, location..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Price Filter */}
                  <div>
                    <label htmlFor="price-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                      <DollarSign size={16} />
                      Price
                    </label>
                    <select
                      id="price-filter"
                      value={priceFilter}
                      onChange={(e) => setPriceFilter(e.target.value as 'all' | 'free' | 'paid')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="all">All Events</option>
                      <option value="free">Free Only</option>
                      <option value="paid">Paid Only</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                      <Calendar size={16} />
                      Sort By
                    </label>
                    <select
                      id="sort-by"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'price')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="date">Date</option>
                      <option value="name">Name (A-Z)</option>
                      <option value="price">Price (Free First)</option>
                    </select>
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setPriceFilter('all');
                      setSortBy('date');
                    }}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
