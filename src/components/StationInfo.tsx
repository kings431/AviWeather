import React from 'react';
import { MapPin, Star, StarOff } from 'lucide-react';
import { Station } from '../types';
import useStore from '../store';
import tzlookup from 'tz-lookup';
import { DateTime } from 'luxon';
import UpdateIndicator from './UpdateIndicator';

interface StationInfoProps {
  station: Station;
  lastUpdated?: number;
}

const StationInfo: React.FC<StationInfoProps> = ({ station, lastUpdated }) => {
  const { favorites, addToFavorites, removeFromFavorites } = useStore();
  const isFavorite = favorites.some(f => f.icao === station.icao);
  
  const toggleFavorite = () => {
    if (isFavorite) {
      removeFromFavorites(station.icao);
    } else {
      addToFavorites(station);
    }
  };

  // Helper to get local time in military (24h) format, using coordinates for timezone
  const getLocalTime = () => {
    if (!station.latitude || !station.longitude) return 'N/A';
    try {
      const tz = tzlookup(station.latitude, station.longitude);
      return DateTime.now().setZone(tz).toFormat('HH:mm:ss');
    } catch {
      // fallback: browser local time
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }
  };

  // Helper to get Zulu (UTC) time with seconds
  const getZuluTime = () => {
    const now = new Date();
    return now.toISOString().slice(11, 19).replace(/:/g, '') + 'Z';
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
          {lastUpdated !== undefined && <UpdateIndicator lastUpdated={lastUpdated} />}
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