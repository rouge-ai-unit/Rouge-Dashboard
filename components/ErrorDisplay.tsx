import React from 'react';

interface ErrorDisplayProps {
  title: string;
  message: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ title, message }) => {
  return (
    <div className="mt-8 p-4 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 rounded-r-lg max-w-3xl mx-auto">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-md font-medium text-red-800 dark:text-red-200">{title}</h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-100">
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
