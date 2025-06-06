import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import useStore from '../store';
import { fetchStationData, fetchWeatherData } from '../services/weatherApi';
import { Station } from '../types';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { 
    favorites,
    recentSearches,
    setSelectedStation,
    addToRecentSearches,
    setWeatherData,
    setIsLoading,
    setError,
    clearError
  } = useStore();
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!query.trim()) return;
    
    const icao = query.trim().toUpperCase();
    
    // ICAO codes are typically 4 characters
    if (icao.length !== 4) {
      setError('Please enter a valid 4-letter ICAO code');
      return;
    }
    
    clearError();
    setIsLoading(true);
    
    try {
      // Fetch station data
      const stationData = await fetchStationData(icao);
      
      // Fetch weather data
      const weatherData = await fetchWeatherData(icao);
      
      setWeatherData(icao, weatherData);
      setSelectedStation(stationData);
      addToRecentSearches(stationData);
      setQuery('');
      setIsDropdownOpen(false);
      
    } catch (error) {
      setError(`Unable to find weather data for ${icao}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSearchForStation = async (station: Station) => {
    clearError();
    setIsLoading(true);
    try {
      // Fetch weather data
      const weatherData = await fetchWeatherData(station.icao);
      setWeatherData(station.icao, weatherData);
      setSelectedStation(station);
      addToRecentSearches(station);
      setQuery('');
      setIsDropdownOpen(false);
    } catch (error) {
      setError(`Unable to find weather data for ${station.icao}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const selectStation = (station: Station) => {
    handleSearchForStation(station);
  };
  
  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <input
            type="text"
            className="input pl-10 pr-4 py-2"
            placeholder="Search by ICAO code (e.g., KJFK)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          {query && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setQuery('')}
            >
              <X size={18} className="text-gray-400" />
            </button>
          )}
        </div>
        <button type="submit" className="sr-only">Search</button>
      </form>
      
      {isDropdownOpen && (query || favorites.length > 0 || recentSearches.length > 0) && (
        <div className="absolute mt-2 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700">
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="p-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Recent Searches</h3>
              {recentSearches.map((station) => (
                <button
                  key={station.icao}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center justify-between"
                  onClick={() => selectStation(station)}
                >
                  <div>
                    <span className="font-medium">{station.icao}</span>
                    {station.name && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {station.name}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* Favorites */}
          {favorites.length > 0 && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Favorites</h3>
              {favorites.map((station) => (
                <button
                  key={station.icao}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center justify-between"
                  onClick={() => selectStation(station)}
                >
                  <div>
                    <span className="font-medium">{station.icao}</span>
                    {station.name && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        {station.name}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* If no matches and no suggestions */}
          {query && !favorites.length && !recentSearches.length && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No matches found. Enter a valid ICAO code.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;