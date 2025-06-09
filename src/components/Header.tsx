import React from 'react';
import { Plane } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import SearchBar from './SearchBar';
import useStore from '../store';
import { useNavigate, Link } from 'react-router-dom';

const Header: React.FC = () => {
  const { setSelectedStations } = useStore();
  const navigate = useNavigate();
  const goHome = () => {
    setSelectedStations([]);
    navigate('/');
  };
  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <button onClick={goHome} className="flex items-center group focus:outline-none" title="Go to home">
              <div className="bg-primary-500 text-white p-2 rounded-lg group-hover:bg-primary-600 transition-colors">
                <Plane size={24} />
              </div>
              <div className="ml-3 text-left">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:underline">AviWeather</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Aviation Weather for Pilots</p>
              </div>
            </button>
            <nav className="ml-6">
              <Link to="/route-planner" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Route Planner</Link>
            </nav>
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