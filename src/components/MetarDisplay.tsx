import React, { useEffect, useState } from 'react';
import { MetarData } from '../types';
import { Wind, Droplets, Thermometer, Gauge } from 'lucide-react';

interface MetarDisplayProps {
  data: MetarData;
  icao?: string;
}

const FlightCategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  let bgColor = 'bg-success-100 text-success-800';
  let label = 'VFR';
  
  switch (category) {
    case 'VFR':
      bgColor = 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200';
      label = 'VFR';
      break;
    case 'MVFR':
      bgColor = 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200';
      label = 'MVFR';
      break;
    case 'IFR':
      bgColor = 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200';
      label = 'IFR';
      break;
    case 'LIFR':
      bgColor = 'bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-200';
      label = 'LIFR';
      break;
  }
  
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${bgColor}`}>
      {label}
    </span>
  );
};

// Helper to format METAR issued time (e.g., 060500Z)
function formatMetarTime(metarTime: string): string {
  if (!metarTime || !/\d{6}Z$/.test(metarTime)) return 'Invalid Date';
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = parseInt(metarTime.slice(0, 2));
  const hour = parseInt(metarTime.slice(2, 4));
  const min = parseInt(metarTime.slice(4, 6));
  const date = new Date(Date.UTC(year, month, day, hour, min));
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toUTCString().replace(':00 GMT', 'Z');
}

const METAR_CHOICES = [2, 3, 6];

const MetarDisplay: React.FC<MetarDisplayProps> = ({ data, icao }) => {
  const [metarChoice, setMetarChoice] = useState(2);
  const [metars, setMetars] = useState<any[]>([]);
  const station = icao || data.station;

  useEffect(() => {
    fetch(`/api/metar?station=${station}&metar_choice=${metarChoice}`)
      .then(res => res.json())
      .then(data => setMetars(data.metars || []));
  }, [station, metarChoice]);

  // Exclude the latest METAR (already shown in detail above)
  const previousMetars = metars.filter(m => m.text !== data.raw);

  return (
    <div className="card space-y-4 animate-fade-in print:hidden">
      {/* Detailed card for the most recent METAR (always shown, from store) */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <FlightCategoryBadge category={data.flight_category} />
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 font-mono text-sm overflow-x-auto">
          {data.raw}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Wind Information */}
          <div className="flex items-start space-x-3">
            <Wind className="text-primary-500 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Wind</h4>
              <p className="text-gray-800 dark:text-gray-200">
                {data.wind ? `${data.wind.direction}° at ${data.wind.speed} ${data.wind.unit}` : 'N/A'}
                {data.wind?.gust && ` (gusting to ${data.wind.gust} ${data.wind.unit})`}
              </p>
            </div>
          </div>
          {/* Visibility */}
          <div className="flex items-start space-x-3">
            <svg className="text-primary-500 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5C5.63636 5 2 12 2 12C2 12 5.63636 19 12 19C18.3636 19 22 12 22 12C22 12 18.3636 5 12 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Visibility</h4>
              <p className="text-gray-800 dark:text-gray-200">
                {data.visibility ? `${data.visibility.value} ${data.visibility.unit}` : 'N/A'}
              </p>
            </div>
          </div>
          {/* Temperature and Dewpoint */}
          <div className="flex items-start space-x-3">
            <Thermometer className="text-primary-500 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Temperature / Dewpoint</h4>
              <p className="text-gray-800 dark:text-gray-200">
                {data.temperature.celsius}°C / {data.dewpoint.celsius}°C
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  ({data.temperature.fahrenheit}°F / {data.dewpoint.fahrenheit}°F)
                </span>
              </p>
            </div>
          </div>
          {/* Humidity */}
          <div className="flex items-start space-x-3">
            <Droplets className="text-primary-500 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Humidity</h4>
              <p className="text-gray-800 dark:text-gray-200">
                {data.humidity}%
              </p>
            </div>
          </div>
          {/* Barometric Pressure */}
          <div className="flex items-start space-x-3">
            <Gauge className="text-primary-500 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Pressure</h4>
              <p className="text-gray-800 dark:text-gray-200">
                {data.barometer.inHg.toFixed(2)} inHg
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  ({data.barometer.hpa.toFixed(1)} hPa)
                </span>
              </p>
            </div>
          </div>
        </div>
        {/* Cloud Layers */}
        {data.clouds && data.clouds.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cloud Layers</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {data.clouds.map((cloud, index) => (
                <div 
                  key={index}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                >
                  <div className="text-sm font-medium">{cloud.type}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {cloud.height} ft{cloud.modifier ? ` (${cloud.modifier})` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Weather Conditions */}
        {data.conditions && data.conditions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Weather Phenomena</h4>
            <div className="flex flex-wrap gap-2">
              {data.conditions.map((condition, index) => (
                <div 
                  key={index}
                  className="px-3 py-1 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                >
                  <span className="font-mono text-sm mr-1">{condition.code}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{condition.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Issued: {formatMetarTime(data.time)}
        </div>
      </div>

      {/* Selector and simple list for previous METARs */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="metar-choice" className="text-xs text-gray-500">Show past</label>
          <select
            id="metar-choice"
            className="text-xs rounded border-gray-300 dark:bg-gray-800 dark:text-gray-100"
            value={metarChoice}
            onChange={e => setMetarChoice(Number(e.target.value))}
          >
            {METAR_CHOICES.map(choice => (
              <option key={choice} value={choice}>{choice} hours</option>
            ))}
          </select>
        </div>
        {previousMetars.length === 0 ? (
          <div className="p-3 text-gray-500">No previous METARs available.</div>
        ) : (
          <ul className="space-y-2">
            {previousMetars.map((metar, idx) => (
              <li key={metar.pk || idx} className="flex flex-col">
                <span className="font-mono text-xs">{metar.text}</span>
                <span className="text-xs text-gray-500">
                  {metar.startValidity ? new Date(metar.startValidity).toUTCString() : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MetarDisplay;