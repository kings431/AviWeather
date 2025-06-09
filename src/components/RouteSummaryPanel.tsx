import React, { useState } from 'react';

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

const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }>
  = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white w-full text-left focus:outline-none hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span>{icon}</span>
        <span>{title}</span>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
};

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
  // Helper: highlight invalid ICAOs or missing data
  const isValidIcao = (icao: string) => /^[A-Z0-9]{4}$/.test(icao);
  return (
    <div className="w-full text-slate-900 dark:text-white">
      {routeData && (
        <div className="mb-4">
          <div className="flex gap-8 text-slate-600 dark:text-slate-300 text-base mb-2">
            <div><span className="font-semibold">Distance:</span> {routeData.distance} nm</div>
            <div><span className="font-semibold">ETE:</span> {routeData.ete} min</div>
          </div>
        </div>
      )}
      <Section title="Waypoints" icon={<span>📍</span>} defaultOpen>
        <ul className="space-y-2">
          {waypoints.map((wp, idx) => (
            <li key={wp.icao + idx} className={!isValidIcao(wp.icao) ? 'text-red-500 dark:text-red-400' : ''}>
              <div className="font-bold inline-block mr-2">{wp.icao || <span className="text-slate-400 dark:text-slate-500">(blank)</span>}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 inline-block">{!isValidIcao(wp.icao) && 'Invalid ICAO'}</div>
              <div className="ml-4">
                <div className="text-xs text-slate-600 dark:text-slate-300">METAR: {metarData[wp.icao]?.raw || <span className="text-yellow-500 dark:text-yellow-400">Loading...</span>}</div>
                <div className="text-xs text-slate-600 dark:text-slate-300">TAF: {tafData[wp.icao]?.raw || <span className="text-yellow-500 dark:text-yellow-400">Loading...</span>}</div>
                {weatherCams[wp.icao] && (
                  <div className="mt-1">
                    <img src={weatherCams[wp.icao].image} alt="Weather Cam" className="w-24 h-16 object-cover rounded" />
                    <a href={weatherCams[wp.icao].url} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline block mt-1">View Camera</a>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="NOTAMs" icon={<span>📝</span>} defaultOpen={false}>
        <ul className="space-y-2">
          {waypoints.map((wp, idx) => (
            <li key={wp.icao + idx}>
              <span className="font-bold mr-2">{wp.icao}</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">{Array.isArray(notamData[wp.icao]) ? notamData[wp.icao].join(', ') : (notamData[wp.icao] || <span className="text-yellow-500 dark:text-yellow-400">Loading...</span>)}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="GFA Charts" icon={<span>🗺️</span>} defaultOpen={false}>
        <ul className="space-y-2">
          {gfaLinks.length === 0 && <li className="text-slate-500 dark:text-slate-400">No GFA charts found.</li>}
          {gfaLinks.map((link, idx) => (
            <li key={idx}><a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">GFA Chart {idx + 1}</a></li>
          ))}
        </ul>
      </Section>
      <Section title="SIGMETs / AIRMETs" icon={<span>⚠️</span>} defaultOpen={false}>
        <ul className="space-y-2">
          {sigmetData.length === 0 && airmetData.length === 0 && <li className="text-slate-500 dark:text-slate-400">None</li>}
          {sigmetData.map((s, idx) => (
            <li key={'sigmet-' + idx} className="text-red-500 dark:text-red-400">SIGMET: {s.text}</li>
          ))}
          {airmetData.map((a, idx) => (
            <li key={'airmet-' + idx} className="text-yellow-500 dark:text-yellow-400">AIRMET: {a.text}</li>
          ))}
        </ul>
      </Section>
      <Section title="PIREPs" icon={<span>✈️</span>} defaultOpen={false}>
        <ul className="space-y-2">
          {pirepData.length === 0 && <li className="text-slate-500 dark:text-slate-400">None</li>}
          {pirepData.map((p, idx) => (
            <li key={'pirep-' + idx}>{p.text} {p.position && <span className="text-xs text-slate-500 dark:text-slate-400">({p.position})</span>}</li>
          ))}
        </ul>
      </Section>
      <div className="flex gap-2 mt-6">
        {onExportGPX && <button onClick={onExportGPX} className="bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 px-3 py-1 rounded font-semibold text-green-900 dark:text-green-100 transition-colors">Export GPX</button>}
        {onExportJSON && <button onClick={onExportJSON} className="bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800 px-3 py-1 rounded font-semibold text-yellow-900 dark:text-yellow-100 transition-colors">Export JSON</button>}
        {onShareRoute && <button onClick={onShareRoute} className="bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 px-3 py-1 rounded font-semibold text-purple-900 dark:text-purple-100 transition-colors">Share Route</button>}
      </div>
    </div>
  );
};

export default RouteSummaryPanel; 