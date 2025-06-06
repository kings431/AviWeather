import React from 'react';
import { WeatherData, Station } from '../types';
import MetarDisplay from './MetarDisplay';
import TafDisplay from './TafDisplay';
import StationInfo from './StationInfo';
import RefreshButton from './RefreshButton';
import UpdateIndicator from './UpdateIndicator';

interface WeatherDisplayProps {
  weatherData: WeatherData;
  station: Station;
  lastUpdated?: number;
}

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weatherData, station, lastUpdated }) => {
  // Prepare raw blocks for print
  const metarRaw = weatherData.metar?.raw || '';
  const tafRaw = weatherData.taf?.raw || '';
  // We'll fetch NOTAMs in NotamDisplay, so just leave a placeholder for now
  return (
    <div className="space-y-6">
      {/* Print-only block: ICAO, airport name, and raw data sections */}
      <div className="print:block hidden mb-8">
        <div className="mb-2">
          <span className="font-bold text-lg">{station.icao}</span>
          {station.name && <span className="ml-2 text-base">- {station.name}</span>}
        </div>
        {metarRaw && (
          <div className="mb-4">
            <div className="font-bold mb-1">METAR</div>
            <pre className="font-mono text-xs whitespace-pre-wrap">{metarRaw}</pre>
          </div>
        )}
        {tafRaw && (
          <div className="mb-4">
            <div className="font-bold mb-1">TAF</div>
            <pre className="font-mono text-xs whitespace-pre-wrap">{tafRaw}</pre>
          </div>
        )}
        {/* NOTAMs will be handled in NotamDisplay with a print block */}
      </div>
      {/* Normal UI (hidden in print) */}
      <UpdateIndicator lastUpdated={lastUpdated} />
      <div className="flex justify-between items-start">
        <h2 className="text-2xl font-semibold">Weather Information</h2>
        <RefreshButton stationId={station.icao} />
      </div>
      <StationInfo station={station} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {weatherData.metar && (
          <MetarDisplay data={weatherData.metar} icao={station.icao} />
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