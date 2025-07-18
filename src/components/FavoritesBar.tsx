import React from 'react';
import useStore from '../store';
import { Star } from 'lucide-react';
import { fetchWeatherData, fetchStationData } from '../services/weatherApi';

const FavoritesBar: React.FC = () => {
  const { 
    favorites, 
    setSelectedStations, 
    setWeatherData,
    setIsLoading,
    setError,
    clearError
  } = useStore();
  
  const handleSelectFavorite = async (stationId: string) => {
    const station = favorites.find(f => f.icao === stationId);
    if (!station) return;
    
    clearError();
    setIsLoading(true);
    
    try {
      const [stationData, weatherData] = await Promise.all([
        fetchStationData(stationId),
        fetchWeatherData(stationId)
      ]);
      setWeatherData(stationId, weatherData);
      setSelectedStations([stationData]);
    } catch (error) {
      setError(`Unable to fetch weather data for ${stationId}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (favorites.length === 0) return null;
  
  return (
    <div className="w-full container mx-auto max-w-7xl px-4 mt-2 mb-8 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center mb-1 sm:mb-0">
          <Star size={16} className="text-warning-500 mr-2" />
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Favorite Stations</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {favorites.map((station) => (
            <button
              key={station.icao}
              onClick={() => handleSelectFavorite(station.icao)}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-150"
            >
              <span className="font-medium">{station.icao}</span>
              {station.iata && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  ({station.iata})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FavoritesBar;