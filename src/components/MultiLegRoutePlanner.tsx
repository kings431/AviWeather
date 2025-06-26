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

  // Calculate route using React Query
  const routeQuery = useQuery({
    queryKey: ['multiLegRoute', validWaypoints.map(wp => wp.icao)],
    queryFn: () => calculateMultiLegRoute(validWaypoints.map(wp => wp.icao)),
    enabled: canCalculateRoute,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Update route in store when query completes
  useEffect(() => {
    if (routeQuery.data) {
      setMultiLegRoute(routeQuery.data);
    }
  }, [routeQuery.data, setMultiLegRoute]);

  // Refresh weather data for all waypoints
  const handleRefreshWeather = async () => {
    if (!multiLegRoute) return;
    
    setIsRefreshing(true);
    try {
      const waypointIcaos = multiLegRoute.waypoints.map(wp => wp.icao);
      const weatherData = await fetchBatchWeatherData(waypointIcaos);
      
      // Update cache with fresh data
      Object.entries(weatherData).forEach(([icao, data]) => {
        updateWeatherCache(icao, data);
      });
      
      // Recalculate route with fresh weather
      const updatedRoute = await calculateMultiLegRoute(waypointIcaos);
      setMultiLegRoute(updatedRoute);
    } catch (error) {
      console.error('Failed to refresh weather:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle waypoint selection for editing
  const handleWaypointSelect = (index: number) => {
    setSelectedWaypointIndex(index);
  };

  // Handle waypoint update
  const handleWaypointUpdate = (index: number, waypoint: Waypoint) => {
    const updatedWaypoints = [...waypoints];
    updatedWaypoints[index] = waypoint;
    setRoutePlanningState({
      ...routePlanningState,
      waypoints: updatedWaypoints,
    });
    setSelectedWaypointIndex(null);
  };

  // Handle waypoint removal
  const handleWaypointRemove = (index: number) => {
    const updatedWaypoints = waypoints.filter((_, i) => i !== index);
    setRoutePlanningState({
      ...routePlanningState,
      waypoints: updatedWaypoints,
    });
    setSelectedWaypointIndex(null);
  };

  // Handle adding new waypoint
  const handleAddWaypoint = () => {
    const newWaypoint: Waypoint = {
      icao: '',
      order: waypoints.length,
    };
    
    setRoutePlanningState({
      ...routePlanningState,
      waypoints: [...waypoints, newWaypoint],
    });
  };

  if (routeQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Calculating route...</p>
        </div>
      </div>
    );
  }

  if (routeQuery.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error calculating route</h3>
            <p className="mt-1 text-sm text-red-700">
              {routeQuery.error instanceof Error ? routeQuery.error.message : 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Waypoint Management */}
      <WaypointManager />

      {/* Route Display */}
      {multiLegRoute && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Route Summary</h3>
            <button
              onClick={handleRefreshWeather}
              disabled={isRefreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Weather
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Total Distance</div>
              <div className="text-2xl font-bold text-gray-900">
                {multiLegRoute.totalDistance.toFixed(1)} nm
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Estimated Time</div>
              <div className="text-2xl font-bold text-gray-900">
                {multiLegRoute.totalEstimatedTime.toFixed(1)} hrs
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Waypoints</div>
              <div className="text-2xl font-bold text-gray-900">
                {multiLegRoute.waypoints.length}
              </div>
            </div>
          </div>

          {/* Route Legs */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Route Legs</h4>
            {multiLegRoute.legs.map((leg, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {leg.departure.icao} → {leg.arrival.icao}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({leg.distance.toFixed(1)} nm)
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {leg.estimatedTime.toFixed(2)} hrs
                  </span>
                </div>
                
                {/* Weather for this leg */}
                {multiLegRoute.weatherData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    {/* Departure Weather */}
                    <div className="bg-blue-50 rounded p-3">
                      <div className="text-xs font-medium text-blue-800 mb-1">
                        {leg.departure.icao} Weather
                      </div>
                      {multiLegRoute.weatherData[leg.departure.icao] ? (
                        <div className="text-xs">
                          <div className="font-mono bg-white p-2 rounded border">
                            {multiLegRoute.weatherData[leg.departure.icao].metar?.raw || 'No METAR data'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">No weather data</div>
                      )}
                    </div>
                    
                    {/* Arrival Weather */}
                    <div className="bg-green-50 rounded p-3">
                      <div className="text-xs font-medium text-green-800 mb-1">
                        {leg.arrival.icao} Weather
                      </div>
                      {multiLegRoute.weatherData[leg.arrival.icao] ? (
                        <div className="text-xs">
                          <div className="font-mono bg-white p-2 rounded border">
                            {multiLegRoute.weatherData[leg.arrival.icao].metar?.raw || 'No METAR data'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">No weather data</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Display */}
      {multiLegRoute && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Map</h3>
          <MultiLegRouteMap route={multiLegRoute} />
        </div>
      )}

      {/* Instructions */}
      {!multiLegRoute && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Add waypoints to plan your route</h3>
              <p className="mt-1 text-sm text-blue-700">
                Enter at least 2 valid ICAO codes to calculate a multi-leg route with weather information.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiLegRoutePlanner; 