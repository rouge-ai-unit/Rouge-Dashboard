import React from 'react';
import type { AgTechEvent } from '@/types/agtech-event-finder';
import { CalendarIcon } from './icons/CalendarIcon';
import { LocationIcon } from './icons/LocationIcon';

interface EventCardProps {
  event: AgTechEvent;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const isFree = event.price?.toLowerCase() === 'free';

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col overflow-hidden border border-gray-700/50 h-full transform hover:-translate-y-1 hover:border-gray-600/50">
      <div className="p-6 flex flex-col flex-grow relative">
        {event.price && (
          <span className={`absolute top-0 right-0 mt-4 mr-4 px-3 py-1 text-sm font-semibold rounded-full ${
            isFree ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          }`}>
            {event.price}
          </span>
        )}
        <h3 className="text-xl font-bold text-white mb-2 pr-16">{event.eventName}</h3>
        
        <div className="space-y-3 mb-4 text-gray-300">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <LocationIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>{event.location}</span>
          </div>
        </div>

        <p className="text-gray-300 text-base mb-6 flex-grow text-left">{event.description}</p>
        
        <div className="mt-auto pt-4 border-t border-gray-700/50">
          <a
            href={event.registrationLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center block bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            aria-label={`Register for ${event.eventName}`}
          >
            Register Now
          </a>
        </div>
      </div>
    </div>
  );
};
