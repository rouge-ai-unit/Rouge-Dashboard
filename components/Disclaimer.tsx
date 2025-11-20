
import React from 'react';

export const Disclaimer: React.FC = () => {
  return (
    <div className="mt-4 p-4 bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-500 rounded-r-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Privacy Note:</strong> Personal contact information (like names, emails, and phone numbers) cannot be extracted automatically. For specific contacts, please refer to sources like Apollo or LinkedIn manually.
          </p>
        </div>
      </div>
    </div>
  );
};
