import React, { useState, useEffect } from 'react';
import useStore from '../store';
import { useRouteStore } from '../store/routeStore';
import { fetchWeatherData, fetchStationData } from '../services/weatherApi';
import { RouteOptimizer } from '../services/routeOptimizer';
import { Route } from '../types';
import { MapContainer, TileLayer, Marker, Polyline, LayersControl } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Plus, Minus, Search, Settings, ChevronDown, ChevronRight, Plane, Clock, Route as RouteIcon } from 'lucide-react';

// Fix Leaflet's default icon path issues with bundlers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface RoutePlannerProps {
  onRouteSelect: (route: Route) => void;
}

export interface Waypoint {
  icao: string;
  lat?: number;
  lon?: number;
}

export interface RouteData {
  waypoints: Waypoint[];
  distance: number;
  ete: number;
}

// Isolated fetchers for route planner
async function fetchWaypointLatLon(icao: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(`/api/openaip?icao=${icao}`);
    if (!res.ok) return null;
    const data = await res.json();
    const airport = data.items && data.items.length > 0 ? data.items[0] : null;
    if (!airport) return null;
    return {
      lat: airport.geometry?.coordinates?.[1],
      lon: airport.geometry?.coordinates?.[0],
    };
  } catch {
    return null;
  }
}

async function fetchMetar(icao: string) {
  const res = await fetch(`/api/metar?icao=${icao}`);
  return res.ok ? res.json() : null;
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({ onRouteSelect }) => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { icao: '' }, // Departure
    { icao: '' }, // Arrival
  ]);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [metarData, setMetarData] = useState<Record<string, any>>({});
  const [tafData, setTafData] = useState<Record<string, any>>({});
  const [validation, setValidation] = useState<boolean[]>([true, true]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedRoute, setSuggestedRoute] = useState<Route | null>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState({
    metar: true,
    taf: false,
    gfa: false,
    sigmet: false,
    airmet: false
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

  const handleWaypointChange = (idx: number, icao: string) => {
    setWaypoints(wps => wps.map((wp, i) => i === idx ? { ...wp, icao: icao.toUpperCase() } : wp));
    setValidation(v => v.map((valid, i) => i === idx ? /^[A-Z0-9]{4}$/.test(icao.toUpperCase()) : valid));
  };

  const addWaypoint = () => {
    setWaypoints(wps => [
      ...wps.slice(0, -1),
      { icao: '' },
      wps[wps.length - 1],
    ]);
    setValidation(v => [...v.slice(0, -1), true, v[v.length - 1]]);
  };

  const removeWaypoint = (idx: number) => {
    setWaypoints(wps => wps.filter((_, i) => i !== idx));
    setValidation(v => v.filter((_, i) => i !== idx));
  };

  const findRoute = async () => {
    setLoading(true);
    setError(null);
    
    // Validate ICAOs
    const valid = waypoints.map(wp => /^[A-Z0-9]{4}$/.test(wp.icao));
    setValidation(valid);
    if (valid.some(v => !v)) { 
      setLoading(false); 
      return; 
    }

    // Fetch lat/lon for each waypoint
    const wpsWithCoords = await Promise.all(
      waypoints.map(async wp => {
        const coords = await fetchWaypointLatLon(wp.icao);
        return coords ? { ...wp, ...coords } : { ...wp };
      })
    );

    if (wpsWithCoords.some(wp => typeof wp.lat !== 'number' || typeof wp.lon !== 'number')) {
      setError('One or more ICAOs not found.');
      setLoading(false);
      return;
    }

    setWaypoints(wpsWithCoords);

    // Calculate distance (great-circle) and ETE
    let distance = 0;
    for (let i = 1; i < wpsWithCoords.length; i++) {
      if (typeof wpsWithCoords[i - 1].lat === 'number' && typeof wpsWithCoords[i - 1].lon === 'number' && typeof wpsWithCoords[i].lat === 'number' && typeof wpsWithCoords[i].lon === 'number') {
        distance += haversine(wpsWithCoords[i - 1] as { lat: number; lon: number }, wpsWithCoords[i] as { lat: number; lon: number });
      }
    }
    const ete = Math.round(distance / cruiseSpeed * 60);
    setRouteData({ waypoints: wpsWithCoords, distance: Math.round(distance), ete });

    // Fetch weather data for each waypoint
    const metar: Record<string, any> = {};
    const taf: Record<string, any> = {};
    
    await Promise.all(wpsWithCoords.map(async (wp) => {
      metar[wp.icao] = await fetchMetar(wp.icao);
    }));

    setMetarData(metar);
    setTafData(taf);
    setLoading(false);

    try {
      const optimizer = RouteOptimizer.getInstance();
      const route = await optimizer.optimizeRoute(wpsWithCoords[0].icao, wpsWithCoords[wpsWithCoords.length - 1].icao, {});
      const estimatedTime = cruiseSpeed > 0 ? Math.round(route.distance / cruiseSpeed * 60) : 0;
      const newRoute = { ...route, estimatedTime };
      setRouteData({
        waypoints: wpsWithCoords,
        distance: route.distance,
        ete: estimatedTime
      });
      setSuggestedRoute(newRoute);
      onRouteSelect(newRoute);
      setCurrentRoute(newRoute);

      const weather = await fetchWeatherData(wpsWithCoords[0].icao);
      setWeatherData(weather);
      setMetarData(weather.metar ? { [wpsWithCoords[0].icao]: weather.metar } : {});
      setTafData(weather.taf ? { [wpsWithCoords[0].icao]: weather.taf } : {});
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate route';
      setError(errorMessage);
      setRouteError(errorMessage);
    }
  };

  // Haversine formula for distance (nm)
  function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 3440.065; // nautical miles
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const aVal = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  }

  const position: LatLngExpression = waypoints.length > 0 && waypoints[0].lat && waypoints[0].lon
    ? [waypoints[0].lat, waypoints[0].lon]
    : [49.91, -97.24];

  const positions = waypoints.filter(wp => wp.lat && wp.lon).map(wp => [wp.lat!, wp.lon!] as [number, number]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">AviWeather</h1>
                <p className="text-sm text-slate-400">Aviation Weather for Pilots</p>
              </div>
            </div>
            <div className="text-lg font-medium text-blue-400">Route Planner</div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by ICAO code (e.g., KJFK)"
                className="bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
              />
            </div>
            <button className="p-2 text-slate-400 hover:text-white">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Route Planning */}
        <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
          {/* Route Section */}
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <RouteIcon className="w-5 h-5 mr-2" />
              Route
            </h2>
            
            {/* From */}
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">From</label>
              <input
                type="text"
                value={waypoints[0]?.icao || ''}
                onChange={(e) => handleWaypointChange(0, e.target.value)}
                maxLength={4}
                className={`w-full bg-slate-700 border ${validation[0] === false ? 'border-red-500' : 'border-slate-600'} rounded-lg px-3 py-2 text-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="ICAO"
              />
            </div>

            {/* Add Waypoint Button */}
            <div className="mb-4 flex justify-center">
              <button
                onClick={addWaypoint}
                className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Waypoint</span>
              </button>
            </div>

            {/* Intermediate Waypoints */}
            {waypoints.slice(1, -1).map((wp, idx) => (
              <div key={idx + 1} className="mb-4 flex items-center space-x-2">
                <input
                  type="text"
                  value={wp.icao}
                  onChange={(e) => handleWaypointChange(idx + 1, e.target.value)}
                  maxLength={4}
                  className={`flex-1 bg-slate-700 border ${validation[idx + 1] === false ? 'border-red-500' : 'border-slate-600'} rounded-lg px-3 py-2 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="ICAO"
                />
                <button
                  onClick={() => removeWaypoint(idx + 1)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* To */}
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">To</label>
              <input
                type="text"
                value={waypoints[waypoints.length - 1]?.icao || ''}
                onChange={(e) => handleWaypointChange(waypoints.length - 1, e.target.value)}
                maxLength={4}
                className={`w-full bg-slate-700 border ${validation[waypoints.length - 1] === false ? 'border-red-500' : 'border-slate-600'} rounded-lg px-3 py-2 text-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="ICAO"
              />
            </div>

            {/* Find Route Button */}
            <button
              onClick={findRoute}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {isLoading ? 'Finding Route...' : 'Find Route'}
            </button>

            {/* Route Summary */}
            {routeData && (
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Distance:</span>
                  <span className="font-mono">{routeData.distance} nm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">ETE:</span>
                  <span className="font-mono flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {Math.floor(routeData.ete / 60)}h {routeData.ete % 60}m
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Route Details */}
          {routeData && (
            <div className="p-6">
              <div className="space-y-2">
                {waypoints.map((wp, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2">
                    <div>
                      <div className="font-mono text-sm">{wp.icao}</div>
                      <div className="text-xs text-slate-400">
                        {idx === 0 ? 'From' : idx === waypoints.length - 1 ? 'To' : 'Via'}
                      </div>
                    </div>
                    {wp.lat && wp.lon && (
                      <div className="text-xs text-slate-400 font-mono">
                        {wp.lat.toFixed(2)}, {wp.lon.toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center - Map */}
        <div className="flex-1 relative">
          <MapContainer 
            center={position} 
            zoom={6} 
            scrollWheelZoom={true}
            className="w-full h-full"
            style={{ background: '#1e293b' }}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Dark">
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite">
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Tiles &copy; Esri"
                />
              </LayersControl.BaseLayer>
              <LayersControl.Overlay name="Weather Radar">
                <TileLayer
                  url="https://tilecache.rainviewer.com/v2/radar/{z}/{x}/{y}/256/6/1_1.png"
                  attribution="Radar &copy; RainViewer"
                  opacity={0.6}
                />
              </LayersControl.Overlay>
            </LayersControl>
            
            {positions.length > 1 && (
              <Polyline 
                positions={positions} 
                color="#3b82f6" 
                weight={3}
                opacity={0.8}
              />
            )}
            
            {waypoints.map((wp, idx) =>
              wp.lat && wp.lon ? (
                <Marker key={wp.icao + idx} position={[wp.lat, wp.lon]}>
                </Marker>
              ) : null
            )}
          </MapContainer>
        </div>

        {/* Right Sidebar - Weather */}
        <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
              Weather
              <ChevronRight className="w-5 h-5" />
            </h2>

            {/* METAR Section */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('metar')}
                className="w-full flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <span className="font-medium">METAR</span>
                {expandedSections.metar ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {expandedSections.metar && (
                <div className="mt-2 space-y-3">
                  {waypoints.filter(wp => wp.icao).map((wp) => (
                    <div key={wp.icao} className="bg-slate-700 rounded-lg p-3">
                      <div className="font-mono text-sm font-semibold mb-2">{wp.icao}</div>
                      <div className="text-xs text-slate-300 font-mono leading-relaxed">
                        {metarData[wp.icao]?.latestMetar?.text || 'Loading...'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TAF Section */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('taf')}
                className="w-full flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <span className="font-medium">TAF</span>
                {expandedSections.taf ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {expandedSections.taf && (
                <div className="mt-2 space-y-3">
                  {waypoints.filter(wp => wp.icao).map((wp) => (
                    <div key={wp.icao} className="bg-slate-700 rounded-lg p-3">
                      <div className="font-mono text-sm font-semibold mb-2">{wp.icao}</div>
                      <div className="text-xs text-slate-300 font-mono leading-relaxed">
                        {tafData[wp.icao]?.raw || 'No TAF available'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GFA Section */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('gfa')}
                className="w-full flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <span className="font-medium">GFA</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* SIGMET Section */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('sigmet')}
                className="w-full flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <span className="font-medium">SIGMET</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* AIRMET Section */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('airmet')}
                className="w-full flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <span className="font-medium">AIRMET</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;