import React from 'react';
import { Plane } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SearchBar from './SearchBar';

const Header: React.FC = () => {
  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <div className="bg-primary-500 text-white p-2 rounded-lg">
              <Plane size={24} />
            </div>
            <div className="ml-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AviWeather</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Aviation Weather for Pilots</p>
            </div>
          </div>
          
          <div className="flex items-center w-full sm:w-auto justify-between sm:justify-end gap-4">
            <SearchBar />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;