import React from 'react';
import { MapPin, Star, StarOff, Navigation } from 'lucide-react';
import { Station } from '../types';
import useStore from '../store';

interface StationInfoProps {
  station: Station;
}

const StationInfo: React.FC<StationInfoProps> = ({ station }) => {
  const { favorites, addToFavorites, removeFromFavorites } = useStore();
  const isFavorite = favorites.some(f => f.icao === station.icao);
  
  const toggleFavorite = () => {
    if (isFavorite) {
      removeFromFavorites(station.icao);
    } else {
      addToFavorites(station);
    }
  };

  const formatCoordinates = () => {
    if (!station.latitude || !station.longitude) return 'Coordinates not available';
    
    const latDir = station.latitude >= 0 ? 'N' : 'S';
    const lonDir = station.longitude >= 0 ? 'E' : 'W';
    
    const latAbs = Math.abs(station.latitude);
    const lonAbs = Math.abs(station.longitude);
    
    return `${latAbs.toFixed(4)}° ${latDir}, ${lonAbs.toFixed(4)}° ${lonDir}`;
  };
  
  return (
    <div className="card print:hidden">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center">
            <h2 className="text-2xl font-semibold">{station.icao}</h2>
            {station.iata && (
              <span className="ml-2 text-sm bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                {station.iata}
              </span>
            )}
          </div>
          
          {station.name && (
            <h3 className="text-lg text-gray-700 dark:text-gray-300 mt-0.5">
              {station.name}
            </h3>
          )}
          
          <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin size={16} className="mr-1" />
            <span>
              {
                (() => {
                  const parts = [station.city, station.state, station.country]
                    .filter(x => x && x !== 'Unknown');
                  return parts.length > 0 ? parts.join(', ') : 'Location unavailable';
                })()
              }
            </span>
          </div>
          
          {(station.latitude && station.longitude) && (
            <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-400">
              <Navigation size={16} className="mr-1" />
              <span>{formatCoordinates()}</span>
            </div>
          )}
          
          {station.elevation !== undefined && (
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Elevation: {station.elevation} ft
            </div>
          )}
        </div>
        
        <button
          onClick={toggleFavorite}
          className="text-warning-500 hover:text-warning-600 dark:text-warning-400 dark:hover:text-warning-300"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? (
            <Star size={24} fill="currentColor" />
          ) : (
            <StarOff size={24} />
          )}
        </button>
      </div>
    </div>
  );
};

export default StationInfo;