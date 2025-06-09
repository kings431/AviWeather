import React from 'react';

interface Waypoint {
  icao: string;
}
interface RouteData {
  waypoints: Waypoint[];
  distance: number;
  ete: number;
}

interface RouteSummaryPanelProps {
  waypoints: Waypoint[];
  routeData: RouteData | null;
  selectedMarker: string | null;
  metarData?: Record<string, any>;
  tafData?: Record<string, any>;
  notamData?: Record<string, any>;
  gfaLinks?: string[];
  sigmetData?: any[];
  airmetData?: any[];
  pirepData?: any[];
  weatherCams?: Record<string, { image: string; url: string }>;
  onExportGPX?: () => void;
  onExportJSON?: () => void;
  onShareRoute?: () => void;
}

const RouteSummaryPanel: React.FC<RouteSummaryPanelProps> = ({
  waypoints,
  routeData,
  selectedMarker,
  metarData = {},
  tafData = {},
  notamData = {},
  gfaLinks = [],
  sigmetData = [],
  airmetData = [],
  pirepData = [],
  weatherCams = {},
  onExportGPX,
  onExportJSON,
  onShareRoute,
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Route Summary</h2>
      {routeData && (
        <div className="mb-4">
          <div>Distance: {routeData.distance} nm</div>
          <div>ETE: {routeData.ete} min</div>
        </div>
      )}
      <div className="mb-4">
        <h3 className="font-semibold">Waypoints</h3>
        <ul>
          {waypoints.map((wp, idx) => (
            <li key={wp.icao + idx} className="mb-2">
              <strong>{wp.icao}</strong>
              <div>METAR: {metarData[wp.icao]?.raw || 'Loading...'}</div>
              <div>TAF: {tafData[wp.icao]?.raw || 'Loading...'}</div>
              {weatherCams[wp.icao] && (
                <div>
                  <img src={weatherCams[wp.icao].image} alt="Weather Cam" className="w-24 h-16 object-cover mt-1" />
                  <a href={weatherCams[wp.icao].url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">View Camera</a>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold">NOTAMs</h3>
        <ul>
          {waypoints.map((wp, idx) => (
            <li key={wp.icao + idx}>
              <strong>{wp.icao}</strong>: {notamData[wp.icao]?.join(', ') || 'Loading...'}
            </li>
          ))}
        </ul>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold">GFA Charts</h3>
        <ul>
          {gfaLinks.map((link, idx) => (
            <li key={idx}><a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">GFA Chart {idx + 1}</a></li>
          ))}
        </ul>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold">SIGMETs / AIRMETs</h3>
        <ul>
          {sigmetData.map((s, idx) => (
            <li key={'sigmet-' + idx}>{s.text}</li>
          ))}
          {airmetData.map((a, idx) => (
            <li key={'airmet-' + idx}>{a.text}</li>
          ))}
        </ul>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold">PIREPs</h3>
        <ul>
          {pirepData.map((p, idx) => (
            <li key={'pirep-' + idx}>{p.text} ({p.position})</li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2 mb-2">
        {onExportGPX && <button onClick={onExportGPX} className="bg-green-200 px-2 py-1 rounded">Export GPX</button>}
        {onExportJSON && <button onClick={onExportJSON} className="bg-yellow-200 px-2 py-1 rounded">Export JSON</button>}
        {onShareRoute && <button onClick={onShareRoute} className="bg-purple-200 px-2 py-1 rounded">Share Route</button>}
      </div>
    </div>
  );
};

export default RouteSummaryPanel; 