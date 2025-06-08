import React, { useState } from 'react';
import { WeatherData, Station } from '../types';
import MetarDisplay from './MetarDisplay';
import TafDisplay from './TafDisplay';
import StationInfo from './StationInfo';
import RefreshButton from './RefreshButton';
import UpdateIndicator from './UpdateIndicator';
import WeatherReports from './WeatherReports';

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

  // Only show the error banner if the error is about an invalid station
  const isStationError = weatherData.error && /invalid ICAO|not found/i.test(weatherData.error);

  // Toggle states for sections
  const [showNotams, setShowNotams] = useState(true);
  const [showMetar, setShowMetar] = useState(true);
  const [showTaf, setShowTaf] = useState(true);

  return (
    <div className="space-y-6">
      {isStationError && (
        <div className="p-4 mb-4 rounded border border-red-700 bg-red-900/20 text-red-200 flex items-center">
          <span className="mr-2">❗</span> {weatherData.error}
        </div>
      )}
      {/* Toggle switches */}
      <div className="flex flex-wrap gap-4 items-center mb-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm">NOTAMs</span>
          <span className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
            <input type="checkbox" checked={showNotams} onChange={() => setShowNotams(v => !v)} className="sr-only peer" />
            <span className="block w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-primary-500 transition" />
            <span className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-4" />
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm">Show Simplified METAR</span>
          <span className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
            <input type="checkbox" checked={showMetar} onChange={() => setShowMetar(v => !v)} className="sr-only peer" />
            <span className="block w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-primary-500 transition" />
            <span className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-4" />
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm">Show Simplified TAF</span>
          <span className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
            <input type="checkbox" checked={showTaf} onChange={() => setShowTaf(v => !v)} className="sr-only peer" />
            <span className="block w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-primary-500 transition" />
            <span className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-4" />
          </span>
        </label>
      </div>
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
      {/* <UpdateIndicator lastUpdated={lastUpdated} /> */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Weather Information</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="print:hidden px-3 py-1 rounded bg-primary-600 text-white text-sm hover:bg-primary-700"
          >
            Print
          </button>
          <RefreshButton stationId={station.icao} />
        </div>
      </div>
      <StationInfo station={station} lastUpdated={lastUpdated} />
      
      {/* Weather Reports (SIGMETs, AIRMETs, PIREPs) */}
      {showNotams && (
        <WeatherReports
          sigmets={weatherData.sigmet}
          airmets={weatherData.airmet}
          pireps={weatherData.pirep}
        />
      )}

      {/* METAR and TAF sections (raw always, simplified toggleable) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* METAR Section */}
        {weatherData.metar && (
          <div className="card p-4 animate-fade-in print:hidden">
            <h3 className="text-xl font-medium mb-2">METAR</h3>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 font-mono text-sm overflow-x-auto mb-4">
              {weatherData.metar.raw}
            </div>
            {showMetar && (
              <MetarDisplay data={weatherData.metar} icao={station.icao} />
            )}
          </div>
        )}
        {/* TAF Section */}
        {weatherData.taf && (
          <div className="card p-4 animate-fade-in print:hidden">
            <h3 className="text-xl font-medium mb-2">TAF</h3>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 font-mono text-sm overflow-x-auto mb-4">
              {weatherData.taf.raw}
            </div>
            {showTaf && (
              <TafDisplay data={weatherData.taf} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherDisplay;