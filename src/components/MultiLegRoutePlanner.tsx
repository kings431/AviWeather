import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Plane, MapPin, Clock, Navigation, RefreshCw, AlertCircle } from 'lucide-react';
import { Waypoint, MultiLegRoute } from '../types/route';
import useStore from '../store';
import WaypointManager from './WaypointManager';
import MultiLegRouteMap from './MultiLegRouteMap';
import { calculateMultiLegRoute, fetchBatchWeatherData } from '../services/weatherApi';
import MetarDisplay from './MetarDisplay';
import TafDisplay from './TafDisplay';
import LoadingSpinner from './LoadingSpinner';

interface MultiLegRoutePlannerProps {
  onRouteSelect?: (route: MultiLegRoute) => void;
}

const MultiLegRoutePlanner: React.FC<MultiLegRoutePlannerProps> = ({ onRouteSelect }) => {
  console.log('MultiLegRoutePlanner render');
  
  const {
    routePlanningState,
    multiLegRoute,
    setMultiLegRoute,
    setRoutePlanningState,
    updateWeatherCache,
    getCachedWeather,
  } = useStore();

  const { waypoints, selectedAircraft, cruiseSpeed } = routePlanningState;

  const [selectedWaypointIndex, setSelectedWaypointIndex] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if we have valid waypoints for route calculation
  const validWaypoints = waypoints.filter(wp => wp.icao && wp.icao.length === 4);
  const canCalculateRoute = validWaypoints.length >= 2;

  console.log('MultiLegRoutePlanner state:', {
    waypoints,
    validWaypoints,
    canCalculateRoute,
    multiLegRoute: !!multiLegRoute
  });

  // Calculate route using React Query
  const routeQuery = useQuery({
    queryKey: ['multiLegRoute', validWaypoints.map(wp => wp.icao)],
    queryFn: () => calculateMultiLegRoute(validWaypoints.map(wp => wp.icao)),
    enabled: canCalculateRoute,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  console.log('Route query state:', {
    isLoading: routeQuery.isLoading,
    error: routeQuery.error,
    data: !!routeQuery.data
  });

  // Update route in store when query completes
  useEffect(() => {
    if (routeQuery.data) {
      setMultiLegRoute(routeQuery.data);
      onRouteSelect?.(routeQuery.data);
    }
  }, [routeQuery.data, setMultiLegRoute, onRouteSelect]);

  // Refresh weather data for all waypoints
  const refreshWeather = useCallback(async () => {
    if (!multiLegRoute) return;

    setIsRefreshing(true);
    try {
      const icaoCodes = multiLegRoute.waypoints.map(wp => wp.icao).filter(Boolean);
      const weatherData = await fetchBatchWeatherData(icaoCodes);
      
      // Update cache with new weather data
      Object.entries(weatherData).forEach(([icao, data]) => {
        updateWeatherCache(icao, data);
      });
      
      // Update route with new weather data
      setMultiLegRoute({
        ...multiLegRoute,
        weatherData,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error('Failed to refresh weather data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [multiLegRoute, updateWeatherCache, setMultiLegRoute]);

  const handleWaypointChange = useCallback((newWaypoints: Waypoint[]) => {
    // This will trigger the route query to recalculate
  }, []);

  const handleWaypointClick = useCallback((waypoint: Waypoint, index: number) => {
    setSelectedWaypointIndex(index);
  }, []);

  const formatTotalDistance = (distance: number) => {
    return `${distance.toFixed(1)} nm`;
  };

  const formatTotalTime = (time: number) => {
    const hours = Math.floor(time);
    const minutes = Math.round((time - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  // Use React Query states directly instead of syncing to store
  const isLoading = routeQuery.isLoading || isRefreshing;
  const error = routeQuery.error ? (routeQuery.error instanceof Error ? routeQuery.error.message : 'Failed to calculate route') : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Multi-Leg Route Planner
        </h2>
        {multiLegRoute && (
          <button
            onClick={refreshWeather}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Weather
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Instructions for new users */}
      {!canCalculateRoute && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Getting Started
          </h3>
          <p className="text-blue-800 dark:text-blue-200">
            Enter at least 2 ICAO codes (departure and destination) to start planning your multi-leg route. 
            You can add intermediate waypoints by clicking "Add Waypoint".
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Waypoint Management */}
        <div className="space-y-6">
          <WaypointManager onWaypointChange={handleWaypointChange} />
          
          {/* Route Summary */}
          {multiLegRoute && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Route Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Distance:</span>
                  <span className="font-semibold">{formatTotalDistance(multiLegRoute.totalDistance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Estimated Time:</span>
                  <span className="font-semibold">{formatTotalTime(multiLegRoute.totalEstimatedTime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Waypoints:</span>
                  <span className="font-semibold">{multiLegRoute.waypoints.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                  <span className="text-sm text-gray-500">
                    {new Date(multiLegRoute.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Aircraft Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Aircraft Settings
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Aircraft Type
                </label>
                <select
                  value={selectedAircraft}
                  onChange={(e) => setRoutePlanningState({ selectedAircraft: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                >
                  <option value="Cessna 172">Cessna 172</option>
                  <option value="Piper PA-28">Piper PA-28</option>
                  <option value="Beechcraft Bonanza">Beechcraft Bonanza</option>
                  <option value="Cirrus SR22">Cirrus SR22</option>
                  <option value="King Air 350">King Air 350</option>
                  <option value="Pilatus PC-12">Pilatus PC-12</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cruise Speed (knots)
                </label>
                <input
                  type="number"
                  value={cruiseSpeed}
                  onChange={(e) => setRoutePlanningState({ cruiseSpeed: parseInt(e.target.value) || 120 })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                  min="50"
                  max="500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Map and Weather */}
        <div className="space-y-6">
          {/* Route Map */}
          <MultiLegRouteMap
            route={multiLegRoute}
            isLoading={isLoading}
            onWaypointClick={handleWaypointClick}
          />

          {/* Weather Display for Selected Waypoint */}
          {selectedWaypointIndex !== null && multiLegRoute && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Weather - {multiLegRoute.waypoints[selectedWaypointIndex]?.icao}
              </h3>
              <div className="space-y-4">
                {multiLegRoute.weatherData[multiLegRoute.waypoints[selectedWaypointIndex]?.icao || '']?.metar && (
                  <MetarDisplay
                    data={multiLegRoute.weatherData[multiLegRoute.waypoints[selectedWaypointIndex]?.icao || '']?.metar!}
                    hideRaw={false}
                  />
                )}
                {multiLegRoute.weatherData[multiLegRoute.waypoints[selectedWaypointIndex]?.icao || '']?.taf && (
                  <TafDisplay
                    data={multiLegRoute.weatherData[multiLegRoute.waypoints[selectedWaypointIndex]?.icao || '']?.taf!}
                    hideRaw={false}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-3">
            <LoadingSpinner />
            <span className="text-gray-700 dark:text-gray-300">Calculating route...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiLegRoutePlanner; 