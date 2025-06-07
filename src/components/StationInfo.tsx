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
  
  // Helper to get local time in military (24h) format
  const getLocalTime = () => {
    if (!station.latitude || !station.longitude) return 'N/A';
    try {
      const now = new Date();
      // Fallback: just use browser local time
      return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return 'N/A';
    }
  };

  // Helper to get Zulu (UTC) time
  const getZuluTime = () => {
    const now = new Date();
    return now.toISOString().slice(11, 16).replace(':', '') + 'Z';
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
          
          {/* Always show the real airport name if available, fallback to ICAO Airport */}
          <h3 className="text-lg text-gray-700 dark:text-gray-300 mt-0.5">
            {station.icao === 'CYBR' ? 'Brandon Airport' : (station.name || `${station.icao} Airport`)}
          </h3>
          
          <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin size={16} className="mr-1" />
            <span>
              {station.latitude && station.longitude
                ? `${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}`
                : 'Location unavailable'}
            </span>
          </div>
          
          {station.elevation !== undefined && (
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Elevation: {station.elevation} ft
            </div>
          )}
        </div>
        
        {/* Right side: Local and Zulu time */}
        <div className="flex flex-col items-end gap-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">Local Time (24h): <span className="font-mono">{getLocalTime()}</span></div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Zulu Time: <span className="font-mono">{getZuluTime()}</span></div>
        </div>
        
        <button
          onClick={toggleFavorite}
          className="text-warning-500 hover:text-warning-600 dark:text-warning-400 dark:hover:text-warning-300 ml-4"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? (
            <StarOff size={22} />
          ) : (
            <Star size={22} />
          )}
        </button>
      </div>
    </div>
  );
};

export default StationInfo;