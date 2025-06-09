import React, { useState } from 'react';

interface RouteInputPanelProps {
  waypoints: { icao: string }[];
  onWaypointChange: (idx: number, icao: string) => void;
  onAddWaypoint: () => void;
  onRemoveWaypoint: (idx: number) => void;
  onFindRoute: () => void;
  onExportGPX?: () => void;
  onExportJSON?: () => void;
  onVoiceInput?: (icao: string) => void;
  onShareRoute?: () => void;
  validation?: boolean[];
}

const RouteInputPanel: React.FC<RouteInputPanelProps> = ({
  waypoints,
  onWaypointChange,
  onAddWaypoint,
  onRemoveWaypoint,
  onFindRoute,
  onExportGPX,
  onExportJSON,
  onVoiceInput,
  onShareRoute,
  validation = [],
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Route Planner</h2>
      {waypoints.map((wp, idx) => (
        <div key={idx} className="mb-2 flex items-center gap-2">
          <input
            type="text"
            value={wp.icao}
            onChange={e => onWaypointChange(idx, e.target.value)}
            maxLength={4}
            className={`p-2 border rounded w-24 uppercase ${validation[idx] === false ? 'border-red-500' : ''}`}
            placeholder={idx === 0 ? 'Departure' : idx === waypoints.length - 1 ? 'Arrival' : 'Waypoint'}
          />
          {onVoiceInput && (
            <button type="button" onClick={() => onVoiceInput(wp.icao)} title="Voice Input" className="p-1">🎤</button>
          )}
          {idx > 0 && idx < waypoints.length - 1 && (
            <button type="button" onClick={() => onRemoveWaypoint(idx)} className="text-red-500">✕</button>
          )}
        </div>
      ))}
      <div className="flex gap-2 mb-4">
        <button type="button" onClick={onAddWaypoint} className="bg-gray-200 px-2 py-1 rounded">+ Add Waypoint</button>
        <button type="button" onClick={onFindRoute} className="bg-blue-600 text-white px-4 py-1 rounded">Find Route</button>
      </div>
      <div className="flex gap-2 mb-2">
        {onExportGPX && <button onClick={onExportGPX} className="bg-green-200 px-2 py-1 rounded">Export GPX</button>}
        {onExportJSON && <button onClick={onExportJSON} className="bg-yellow-200 px-2 py-1 rounded">Export JSON</button>}
        {onShareRoute && <button onClick={onShareRoute} className="bg-purple-200 px-2 py-1 rounded">Share Route</button>}
      </div>
    </div>
  );
};

export default RouteInputPanel; 