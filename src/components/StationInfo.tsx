import React, { useEffect, useState } from 'react';
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

  // State for live time
  const [now, setNow] = useState(DateTime.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(DateTime.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get local time zone from coordinates
  let localTimeString = 'N/A';
  let localTzAbbr: string = '';
  if (station.latitude && station.longitude) {
    try {
      const tz = tzlookup(station.latitude, station.longitude);
      const local = now.setZone(tz);
      localTimeString = local.toFormat('MMMM d, yyyy, h:mm:ss a');
      localTzAbbr = local.offsetNameShort || '';
    } catch {
      localTimeString = now.toFormat('MMMM d, yyyy, h:mm:ss a');
      localTzAbbr = now.offsetNameShort || '';
    }
  }

  // Zulu (UTC) time
  const zuluTimeString = now.toUTC().toFormat('MMMM d, yyyy, HH:mm:ss') + ' UTC';

  return (
    <div className="card print:hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0">
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-2">
            <h2 className="text-xl sm:text-2xl font-semibold">{station.icao}</h2>
            {station.iata && (
              <span className="text-xs sm:text-sm bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                {station.iata}
              </span>
            )}
          </div>
          {/* Always show the real airport name if available, fallback to ICAO Airport */}
          <h3 className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mt-1">
            {station.icao === 'CYBR' ? 'Brandon Airport' : (station.name || `${station.icao} Airport`)}
          </h3>
          <div className="flex items-center mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            <MapPin size={16} className="mr-1" />
            <span>
              {station.latitude && station.longitude
                ? `${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}`
                : 'Location unavailable'}
            </span>
          </div>
          {station.elevation !== undefined && (
            <div className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Elevation: {station.elevation} ft
            </div>
          )}
        </div>
        {/* Right side: Local and Zulu time, and favorite button */}
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1 mt-2 sm:mt-0">
          <div className="text-xs sm:text-xs text-gray-500 dark:text-gray-400">
            Local Time: <span className="font-mono">{localTimeString} {localTzAbbr && `(${localTzAbbr})`}</span>
          </div>
          <div className="text-xs sm:text-xs text-gray-500 dark:text-gray-400">
            Zulu Time: <span className="font-mono">{zuluTimeString}</span>
          </div>
          {lastUpdated !== undefined && <UpdateIndicator lastUpdated={lastUpdated} />}
          <button
            onClick={toggleFavorite}
            className="text-warning-500 hover:text-warning-600 dark:text-warning-400 dark:hover:text-warning-300 ml-2 sm:ml-4 mt-1 sm:mt-0"
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
    </div>
  );
};

export default StationInfo;