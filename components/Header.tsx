
import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500 mb-2">
                AgTech University Finder
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
                Discover agricultural universities and their innovation hubs across the globe.
            </p>
        </header>
    );
}
