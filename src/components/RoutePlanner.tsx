import React, { useState, useEffect } from 'react';
import useStore from '../store';
import { useRouteStore } from '../store/routeStore';
import { fetchWeatherData, fetchStationData } from '../services/weatherApi';
import { RouteOptimizer } from '../services/routeOptimizer';
import { Route } from '../types';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';
import AirportAutocomplete from './AirportAutocomplete';
import RouteMap from '../routeWeather/RouteMap';
import RouteWeatherToggles, { WeatherToggleType } from '../routeWeather/RouteWeatherToggles';
import RouteWeatherDisplay from '../routeWeather/RouteWeatherDisplay';

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
  const [waypointCoords, setWaypointCoords] = useState<{ icao: string; lat: number; lon: number }[]>([]);
  const [alternateCoords, setAlternateCoords] = useState<{ icao: string; lat: number; lon: number }[]>([]);
  const [weatherToggles, setWeatherToggles] = useState<WeatherToggleType[]>(['METAR', 'TAF', 'NOTAM']);
  const [pendingDeparture, setPendingDeparture] = useState<string>('');
  const [pendingArrival, setPendingArrival] = useState<string>('');
  const [inputValidation, setInputValidation] = useState({
    departure: { isValid: true, message: '' },
    arrival: { isValid: true, message: '' }
  });

  const { favorites } = useStore();
  const { setCurrentRoute, setAlternateAirports, setLoading, setError: setRouteError } = useRouteStore();

  const aircraftPresets = [
    { label: 'Cessna 172', speed: 120 },
    { label: 'Piper PA-28', speed: 115 },
    { label: 'Beechcraft Bonanza', speed: 170 },
    { label: 'Cirrus SR22', speed: 180 },
    { label: 'King Air 350', speed: 310 },
    { label: 'Pilatus PC-12', speed: 270 },
    { label: 'Custom', speed: 120 },
  ];
  const [selectedAircraft, setSelectedAircraft] = useState(aircraftPresets[0].label);
  const [cruiseSpeed, setCruiseSpeed] = useState<number>(aircraftPresets[0].speed);

  useEffect(() => {
    const preset = aircraftPresets.find(a => a.label === selectedAircraft);
    if (preset) {
      if (selectedAircraft === 'Custom') {
        setCruiseSpeed(prev => (typeof prev === 'number' && prev > 0 ? prev : 120));
      } else {
        setCruiseSpeed(preset.speed);
      }
    }
  }, [selectedAircraft]);

  const validateIcaoCode = (code: string): boolean => {
    return /^[A-Z]{4}$/.test(code);
  };

  const handleDepartureChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setPendingDeparture(upperValue);
    setInputValidation(prev => ({
      ...prev,
      departure: {
        isValid: upperValue.length === 0 || validateIcaoCode(upperValue),
        message: upperValue.length > 0 && !validateIcaoCode(upperValue) ? 'Must be a 4-letter ICAO code' : ''
      }
    }));
  };

  const handleArrivalChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setPendingArrival(upperValue);
    setInputValidation(prev => ({
      ...prev,
      arrival: {
        isValid: upperValue.length === 0 || validateIcaoCode(upperValue),
        message: upperValue.length > 0 && !validateIcaoCode(upperValue) ? 'Must be a 4-letter ICAO code' : ''
      }
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchRoute();
    }
  };

  const handleSearchRoute = () => {
    const isDepartureValid = validateIcaoCode(pendingDeparture);
    const isArrivalValid = validateIcaoCode(pendingArrival);

    setInputValidation({
      departure: {
        isValid: isDepartureValid,
        message: !isDepartureValid ? 'Must be a 4-letter ICAO code' : ''
      },
      arrival: {
        isValid: isArrivalValid,
        message: !isArrivalValid ? 'Must be a 4-letter ICAO code' : ''
      }
    });

    if (!isDepartureValid || !isArrivalValid) {
      setError('Please enter valid 4-letter ICAO codes for both departure and arrival.');
      return;
    }

    if (pendingDeparture === pendingArrival) {
      setError('Departure and arrival airports cannot be the same.');
      return;
    }

    setDeparture(pendingDeparture);
    setArrival(pendingArrival);
    calculateRoute(pendingDeparture, pendingArrival);
  };

  const handleClearRoute = () => {
    setDeparture('');
    setArrival('');
    setPendingDeparture('');
    setPendingArrival('');
    setSuggestedRoute(null);
    setWeatherData(null);
    setError(null);
    setInputValidation({
      departure: { isValid: true, message: '' },
      arrival: { isValid: true, message: '' }
    });
  };

  const handleSwapAirports = () => {
    const temp = pendingDeparture;
    setPendingDeparture(pendingArrival);
    setPendingArrival(temp);
  };

  const calculateRoute = async (dep: string, arr: string) => {
    console.log('calculateRoute', dep, arr);
    setIsLoading(true);
    setError(null);
    try {
      const optimizer = RouteOptimizer.getInstance();
      const route = await optimizer.optimizeRoute(dep, arr, optimizationCriteria);
      console.log('Route calculated', route);
      const estimatedTime = cruiseSpeed > 0 ? Math.round(route.distance / cruiseSpeed * 60) : 0;
      const newRoute = { ...route, estimatedTime };
      // Only update if different
      setSuggestedRoute(prev => {
        if (!prev || JSON.stringify(prev) !== JSON.stringify(newRoute)) {
          return newRoute;
        }
        return prev;
      });
      // Fetch weather data for the route
      const weather = await fetchWeatherData(dep);
      console.log('Weather fetched', weather);
      setWeatherData(weather);
      onRouteSelect(newRoute);
      setCurrentRoute(newRoute);
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

  // Fetch waypoint coordinates when suggestedRoute changes
  useEffect(() => {
    const fetchCoords = async () => {
      if (!suggestedRoute) return;
      const coords = await Promise.all(
        suggestedRoute.waypoints.map(async (icao) => {
          const station = await fetchStationData(icao);
          return {
            icao,
            lat: station.latitude || 0,
            lon: station.longitude || 0,
          };
        })
      );
      setWaypointCoords(coords.filter(wp => wp.lat && wp.lon));
    };
    fetchCoords();
  }, [suggestedRoute]);

  // Fetch alternate coordinates when alternates change
  useEffect(() => {
    const fetchCoords = async () => {
      const coords = await Promise.all(
        alternates.map(async (icao) => {
          const station = await fetchStationData(icao);
          return {
            icao,
            lat: station.latitude || 0,
            lon: station.longitude || 0,
          };
        })
      );
      setAlternateCoords(coords.filter(a => a.lat && a.lon));
    };
    fetchCoords();
  }, [alternates]);

  useEffect(() => {
    console.log('[RoutePlanner] suggestedRoute:', suggestedRoute);
  }, [suggestedRoute]);
  useEffect(() => {
    console.log('[RoutePlanner] currentRoute:', useRouteStore.getState().currentRoute);
  }, [useRouteStore.getState().currentRoute]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Route Planner</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Departure</label>
          <div className="relative">
            <input
              type="text"
              value={pendingDeparture}
              onChange={(e) => handleDepartureChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 ${
                !inputValidation.departure.isValid ? 'border-red-500' : ''
              }`}
              placeholder="Enter ICAO code"
              maxLength={4}
            />
            {!inputValidation.departure.isValid && (
              <p className="text-red-500 text-xs mt-1">{inputValidation.departure.message}</p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Arrival</label>
          <div className="relative">
            <input
              type="text"
              value={pendingArrival}
              onChange={(e) => handleArrivalChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 ${
                !inputValidation.arrival.isValid ? 'border-red-500' : ''
              }`}
              placeholder="Enter ICAO code"
              maxLength={4}
            />
            {!inputValidation.arrival.isValid && (
              <p className="text-red-500 text-xs mt-1">{inputValidation.arrival.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          onClick={handleSearchRoute}
        >
          Search Route
        </button>
        <button
          className="py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          onClick={handleSwapAirports}
          title="Swap departure and arrival"
        >
          ⇄
        </button>
        <button
          className="py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700 transition"
          onClick={handleClearRoute}
          title="Clear route"
        >
          Clear
        </button>
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

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Aircraft Selection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Aircraft Preset</label>
            <select
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              value={selectedAircraft}
              onChange={e => setSelectedAircraft(e.target.value)}
            >
              {aircraftPresets.map(preset => (
                <option key={preset.label} value={preset.label}>{preset.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cruise Speed (knots)</label>
            <input
              type="number"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              value={cruiseSpeed}
              min="60"
              max="600"
              step="1"
              onChange={e => setCruiseSpeed(Number(e.target.value) || 120)}
              disabled={selectedAircraft !== 'Custom'}
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
              {suggestedRoute.estimatedTime && suggestedRoute.estimatedTime > 0 ? (
                <> Estimated Time: {suggestedRoute.estimatedTime}min</>
              ) : (
                <> Estimated Time: N/A</>
              )}
            </p>
          </div>
          <div className="mt-4">
            <RouteMap
              waypoints={waypointCoords}
              alternates={alternateCoords}
              weatherToggles={weatherToggles}
            />
          </div>
          {/* Weather for each airport in the route */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Route Weather Details</h2>
            {suggestedRoute.waypoints.map((icao, idx) => (
              <RouteWeatherDisplay key={icao + '-' + idx} icao={icao} weatherToggles={weatherToggles} />
            ))}
            {alternates.map((icao, idx) => (
              <RouteWeatherDisplay key={icao + '-alt-' + idx} icao={icao} weatherToggles={weatherToggles} />
            ))}
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
    </div>
  );
}; 