import React, { useState, useCallback } from 'react';
import { Plus, Minus, MapPin, Plane, ArrowRight } from 'lucide-react';
import { Waypoint } from '../types/route';
import useStore from '../store';
import AirportAutocomplete from './AirportAutocomplete';

interface WaypointManagerProps {
  onWaypointChange?: (waypoints: Waypoint[]) => void;
}

const WaypointManager: React.FC<WaypointManagerProps> = ({ onWaypointChange }) => {
  const {
    routePlanningState,
    addWaypoint,
    removeWaypoint,
    updateWaypoint,
    setRoutePlanningState,
  } = useStore();

  const { waypoints, isLoading, error } = routePlanningState;

  const handleAddWaypoint = useCallback((index?: number) => {
    const newWaypoint: Waypoint = { icao: '', order: 0 };
    addWaypoint(newWaypoint, index);
    onWaypointChange?.(waypoints);
  }, [addWaypoint, waypoints, onWaypointChange]);

  const handleRemoveWaypoint = useCallback((index: number) => {
    if (waypoints.length <= 2) {
      // Don't allow removing if only 2 waypoints remain
      return;
    }
    removeWaypoint(index);
    onWaypointChange?.(waypoints);
  }, [removeWaypoint, waypoints, onWaypointChange]);

  const handleWaypointChange = useCallback((index: number, icao: string) => {
    updateWaypoint(index, { icao: icao.toUpperCase() });
    onWaypointChange?.(waypoints);
  }, [updateWaypoint, waypoints, onWaypointChange]);

  const getWaypointIcon = (index: number) => {
    if (index === 0) return <Plane className="w-4 h-4 text-green-600" />;
    if (index === waypoints.length - 1) return <MapPin className="w-4 h-4 text-red-600" />;
    return <MapPin className="w-4 h-4 text-blue-600" />;
  };

  const getWaypointLabel = (index: number) => {
    if (index === 0) return 'Departure';
    if (index === waypoints.length - 1) return 'Destination';
    return `Waypoint ${index}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Route Waypoints
        </h3>
        <button
          onClick={() => handleAddWaypoint()}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          disabled={isLoading}
        >
          <Plus className="w-4 h-4" />
          Add Waypoint
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {waypoints.map((waypoint, index) => (
          <div key={`${waypoint.icao}-${index}`} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getWaypointIcon(index)}
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
                {getWaypointLabel(index)}
              </span>
            </div>

            <div className="flex-1">
              <AirportAutocomplete
                onSelect={(icao: string) => handleWaypointChange(index, icao)}
                placeholder="Enter ICAO code"
                exclude={waypoints.map(wp => wp.icao).filter(Boolean)}
              />
            </div>

            {index < waypoints.length - 1 && (
              <ArrowRight className="w-4 h-4 text-gray-400" />
            )}

            <button
              onClick={() => handleRemoveWaypoint(index)}
              disabled={waypoints.length <= 2}
              className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={waypoints.length <= 2 ? "Cannot remove - minimum 2 waypoints required" : "Remove waypoint"}
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Minimum 2 waypoints required • Click "Add Waypoint" to add intermediate stops
      </div>
    </div>
  );
};

export default WaypointManager; 