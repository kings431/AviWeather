import React, { useEffect, useState } from 'react';
import { WeatherToggleType } from './RouteWeatherToggles';
import { fetchWeatherData } from '../services/weatherApi';
import MetarDisplay from '../components/MetarDisplay';
import TafDisplay from '../components/TafDisplay';
import NotamDisplay from '../components/NotamDisplay';
import GFADisplay from '../components/GFADisplay';
import RadarDisplay from '../components/RadarDisplay';
import WeatherCameras from '../components/WeatherCameras';
import WeatherReports from '../components/WeatherReports';
import { Station, WeatherData } from '../types';
import { fetchStationData } from '../services/weatherApi';

interface RouteWeatherDisplayProps {
  icao: string;
  weatherToggles: WeatherToggleType[];
}

const RouteWeatherDisplay: React.FC<RouteWeatherDisplayProps> = ({ icao, weatherToggles }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchWeatherData(icao),
      fetchStationData(icao)
    ]).then(([weatherData, stationData]) => {
      if (isMounted) {
        setWeather(weatherData);
        setStation(stationData);
        setLoading(false);
      }
    }).catch((err) => {
      if (isMounted) {
        setError(err instanceof Error ? err.message : 'Failed to fetch weather');
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [icao]);

  if (loading) return <div className="p-4">Loading weather for {icao}...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!weather || !station) return null;

  return (
    <div className="mb-8 card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-2">{icao} {station.name ? `- ${station.name}` : ''}</h2>
      {weatherToggles.includes('METAR') && weather.metar && (
        <div className="mb-4">
          <MetarDisplay data={weather.metar} icao={icao} />
        </div>
      )}
      {weatherToggles.includes('TAF') && weather.taf && (
        <div className="mb-4">
          <TafDisplay data={weather.taf} />
        </div>
      )}
      {weatherToggles.includes('NOTAM') && (
        <div className="mb-4">
          <NotamDisplay icao={icao} />
        </div>
      )}
      {weatherToggles.includes('GFA') && (
        <div className="mb-4">
          <GFADisplay icao={icao} />
        </div>
      )}
      {weatherToggles.includes('RADAR') && (
        <div className="mb-4">
          <RadarDisplay icao={icao} />
        </div>
      )}
      {weatherToggles.includes('WEATHERCAM') && (
        <div className="mb-4">
          <WeatherCameras icao={icao} />
        </div>
      )}
      {(weatherToggles.includes('SIGMET') || weatherToggles.includes('AIRMET') || weatherToggles.includes('PIREP')) && (
        <div className="mb-4">
          <WeatherReports
            sigmets={weatherToggles.includes('SIGMET') ? weather.sigmet : []}
            airmets={weatherToggles.includes('AIRMET') ? weather.airmet : []}
            pireps={weatherToggles.includes('PIREP') ? weather.pirep : []}
          />
        </div>
      )}
    </div>
  );
};

export default RouteWeatherDisplay; 