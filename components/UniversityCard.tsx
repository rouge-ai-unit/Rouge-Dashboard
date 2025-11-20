
import React from 'react';
import { University } from '../types';

interface UniversityCardProps {
  university: University;
}

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
    <div className="flex items-start">
        <div className="flex-shrink-0 h-6 w-6 text-emerald-500">{icon}</div>
        <div className="ml-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-200">{value}</p>
        </div>
    </div>
);


export const UniversityCard: React.FC<UniversityCardProps> = ({ university }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden transform hover:-translate-y-1">
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">{university.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          {university.location}
        </p>
        
        <div className="mt-6 space-y-4">
            <Stat 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                label="KTO / TTO Office"
                value={university.ktoTtoOffice}
            />
            <Stat 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
                label="Incubation Focus"
                value={university.incubationRecord.focus}
            />
             <Stat 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                label="Incubated Startups"
                value={university.incubationRecord.count > 0 ? university.incubationRecord.count : 'N/A'}
            />
        </div>

        {university.website && (
          <div className="mt-6">
            <a
              href={university.website}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center px-4 py-2 bg-emerald-50 dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 font-semibold rounded-lg hover:bg-emerald-100 dark:hover:bg-gray-600 transition-colors"
            >
              Visit Website
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
