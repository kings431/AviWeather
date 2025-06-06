import React from 'react';
import { WeatherData, Station } from '../types';
import MetarDisplay from './MetarDisplay';
import TafDisplay from './TafDisplay';
import StationInfo from './StationInfo';
import RefreshButton from './RefreshButton';

interface WeatherDisplayProps {
  weatherData: WeatherData;
  station: Station;
}

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weatherData, station }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h2 className="text-2xl font-semibold">Weather Information</h2>
        <RefreshButton stationId={station.icao} />
      </div>
      
      <StationInfo station={station} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {weatherData.metar && (
          <MetarDisplay data={weatherData.metar} />
        )}
        
        {weatherData.taf && (
          <TafDisplay data={weatherData.taf} />
        )}
      </div>
      
      {(!weatherData.metar && !weatherData.taf) && weatherData.error && (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400">{weatherData.error}</p>
        </div>
      )}
    </div>
  );
};

export default WeatherDisplay;