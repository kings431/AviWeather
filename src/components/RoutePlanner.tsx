import React, { useState, useEffect } from 'react';
import useStore from '../store';
import { useRouteStore } from '../store/routeStore';
import { fetchWeatherData } from '../services/weatherApi';
import { RouteOptimizer } from '../services/routeOptimizer';
import { Route } from '../types';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';

interface RoutePlannerProps {
  onRouteSelect: (route: Route) => void;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({ onRouteSelect }) => {
  console.log('RoutePlanner render');
  const [departure, setDeparture] = useState<string>('');
  const [arrival, setArrival] = useState<string>('');
  const [alternates, setAlternates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedRoute, setSuggestedRoute] = useState<Route | null>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [optimizationCriteria, setOptimizationCriteria] = useState({
    minDistance: true,
    avoidWeather: true,
    preferAirways: true,
    maxAltitude: 18000
  });

  const { favorites } = useStore();
  const { setCurrentRoute, setAlternateAirports, setLoading, setError: setRouteError } = useRouteStore();

  const handleDepartureChange = (value: string) => {
    console.log('handleDepartureChange', value);
    setDeparture(value);
    if (value && arrival) {
      calculateRoute(value, arrival);
    }
  };

  const handleArrivalChange = (value: string) => {
    console.log('handleArrivalChange', value);
    setArrival(value);
    if (departure && value) {
      calculateRoute(departure, value);
    }
  };

  const calculateRoute = async (dep: string, arr: string) => {
    console.log('calculateRoute', dep, arr);
    setIsLoading(true);
    setError(null);
    try {
      const optimizer = RouteOptimizer.getInstance();
      const route = await optimizer.optimizeRoute(dep, arr, optimizationCriteria);
      console.log('Route calculated', route);
      setSuggestedRoute(route);
      
      // Fetch weather data for the route
      const weather = await fetchWeatherData(dep);
      console.log('Weather fetched', weather);
      setWeatherData(weather);
      
      onRouteSelect(route);
      setCurrentRoute(route);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate route';
      console.error('Route calculation error', err);
      setError(errorMessage);
      setRouteError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const addAlternate = (icao: string) => {
    if (!alternates.includes(icao)) {
      setAlternates([...alternates, icao]);
    }
  };

  const removeAlternate = (icao: string) => {
    setAlternates(alternates.filter(a => a !== icao));
  };

  const handleOptimizationChange = (key: keyof typeof optimizationCriteria, value: boolean | number) => {
    setOptimizationCriteria(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Route Planner</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Departure</label>
          <input
            type="text"
            value={departure}
            onChange={(e) => handleDepartureChange(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder="Enter ICAO code"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Arrival</label>
          <input
            type="text"
            value={arrival}
            onChange={(e) => handleArrivalChange(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder="Enter ICAO code"
          />
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Route Optimization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={optimizationCriteria.minDistance}
              onChange={(e) => handleOptimizationChange('minDistance', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span>Minimize Distance</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={optimizationCriteria.avoidWeather}
              onChange={(e) => handleOptimizationChange('avoidWeather', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span>Avoid Bad Weather</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={optimizationCriteria.preferAirways}
              onChange={(e) => handleOptimizationChange('preferAirways', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span>Prefer Airways</span>
          </label>
          <div>
            <label className="block text-sm font-medium mb-1">Max Altitude (ft)</label>
            <input
              type="number"
              value={optimizationCriteria.maxAltitude}
              onChange={(e) => handleOptimizationChange('maxAltitude', parseInt(e.target.value))}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              min="0"
              max="60000"
              step="1000"
            />
          </div>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {suggestedRoute && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Suggested Route</h3>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
            <p className="font-mono">{suggestedRoute.waypoints.join(' → ')}</p>
            <p className="text-sm mt-2">
              Distance: {suggestedRoute.distance}nm | 
              Estimated Time: {suggestedRoute.estimatedTime}min
            </p>
          </div>
        </div>
      )}

      {weatherData && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Route Weather</h3>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
            {/* Weather information will be displayed here */}
          </div>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Alternate Airports</h3>
        <div className="flex flex-wrap gap-2">
          {alternates.map(icao => (
            <div key={icao} className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
              <span>{icao}</span>
              <button
                onClick={() => removeAlternate(icao)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 