import React, { useState, useEffect, useRef, useCallback } from 'react';
import useStore from '../store';
import { useRouteStore } from '../store/routeStore';
import { fetchWeatherData, fetchStationData, fetchNearestAirports } from '../services/weatherApi';
import { RouteOptimizer } from '../services/routeOptimizer';
import { Route } from '../types';
import { MapContainer, TileLayer, Marker, Polyline, LayersControl, Popup } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Plus, Minus, Search, Settings, ChevronDown, ChevronRight, Plane, Clock, Route as RouteIcon, MapPin } from 'lucide-react';
import Header from './Header';

// Fix Leaflet's default icon path issues with bundlers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom green icon for alternates
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
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

interface AlternateAirport {
  icao: string;
  name: string;
  distance: number;
  bearing: number;
  lat: number;
  lon: number;
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

// Helper functions for alternates calculation
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({ onRouteSelect }) => {
  console.log('RoutePlanner render');

  // Use Zustand selectors to only subscribe to the state you need
  const routeWaypoints = useStore(state => state.routeWaypoints);
  const setRouteWaypoints = useStore(state => state.setRouteWaypoints);
  const routeData = useStore(state => state.routeData);
  const setRouteData = useStore(state => state.setRouteData);
  const metarData = useStore(state => state.metarData);
  const setMetarData = useStore(state => state.setMetarData);
  const tafData = useStore(state => state.tafData);
  const setTafData = useStore(state => state.setTafData);
  const favorites = useStore(state => state.favorites);

  const { setCurrentRoute, setError: setRouteError } = useRouteStore();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const initialValues = useRef<string[]>([]);
  const isInitialized = useRef(false);

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

  // Local state for ICAO input fields
  const [localInputs, setLocalInputs] = useState(() => routeWaypoints.map(wp => wp.icao));

  // Local state for alternate airport ICAOs
  const [alternateInputs, setAlternateInputs] = useState('');

  // Sync localInputs when number of waypoints changes
  useEffect(() => {
    setLocalInputs(routeWaypoints.map(wp => wp.icao));
  }, [routeWaypoints.length]);

  // On input change, update only local state
  const handleInputChange = (idx: number, value: string) => {
    setLocalInputs(inputs => inputs.map((v, i) => i === idx ? value.toUpperCase() : v));
  };

  // On blur, update global state
  const handleInputBlur = (idx: number) => {
    const newIcao = localInputs[idx].toUpperCase();
    setRouteWaypoints(wps => wps.map((wp, i) => i === idx ? { ...wp, icao: newIcao } : wp));
    setValidation(v => v.map((valid, i) => i === idx ? /^[A-Z0-9]{4}$/.test(newIcao) : valid));
  };

  // Handler for alternate input change
  const handleAlternateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAlternateInputs(e.target.value.toUpperCase());
  };

  // Handler for alternate input blur (could be used to validate or parse)
  const handleAlternateInputBlur = () => {
    // Optionally, parse and validate here
    // const alternates = alternateInputs.split(',').map(s => s.trim()).filter(Boolean);
    // setAlternateAirports(alternates); // If you want to store as array
  };

  // Handle aircraft speed changes
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

  const handleWaypointChange = useCallback((idx: number, value: string) => {
    setLocalInputs(prev => prev.map((v, i) => i === idx ? value.toUpperCase() : v));
    const newIcao = value.toUpperCase();
    setRouteWaypoints((wps: Waypoint[]) => wps.map((wp, i) => i === idx ? { ...wp, icao: newIcao } : wp));
    setValidation(v => v.map((valid, i) => i === idx ? /^[A-Z0-9]{4}$/.test(newIcao) : valid));
  }, [setRouteWaypoints]);

  // Memoize the add waypoint handler
  const addWaypoint = useCallback(() => {
    setRouteWaypoints((wps: Waypoint[]) => [
      ...wps.slice(0, -1),
      { icao: '' },
      wps[wps.length - 1],
    ]);
    setValidation(v => [...v.slice(0, -1), true, v[v.length - 1]]);
  }, [setRouteWaypoints]);

  // Memoize the remove waypoint handler
  const removeWaypoint = useCallback((idx: number) => {
    setRouteWaypoints((wps: Waypoint[]) => wps.filter((_, i) => i !== idx));
    setValidation(v => v.filter((_, i) => i !== idx));
  }, [setRouteWaypoints]);

  // Memoize the toggle section handler
  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Add state for user and calculated alternates
  const [userAlternates, setUserAlternates] = useState<AlternateAirport[]>([]);
  const [calculatedAlternates, setCalculatedAlternates] = useState<AlternateAirport[]>([]);

  // Batching state updates in findRoute
  const findRoute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    // Validate ICAOs
    const valid = routeWaypoints.map(wp => /^[A-Z0-9]{4}$/.test(wp.icao));
    setValidation(valid);
    if (valid.some(v => !v)) { 
      setIsLoading(false); 
      return; 
    }
    // Fetch lat/lon for each waypoint
    const wpsWithCoords = await Promise.all(
      routeWaypoints.map(async wp => {
        const coords = await fetchWaypointLatLon(wp.icao);
        return coords ? { ...wp, ...coords } : { ...wp };
      })
    );
    if (wpsWithCoords.some(wp => typeof wp.lat !== 'number' || typeof wp.lon !== 'number')) {
      setError('One or more ICAOs not found.');
      setIsLoading(false);
      return;
    }
    // Batch all state updates here
    setRouteWaypoints(wpsWithCoords);
    let distance = 0;
    for (let i = 1; i < wpsWithCoords.length; i++) {
      if (typeof wpsWithCoords[i - 1].lat === 'number' && typeof wpsWithCoords[i - 1].lon === 'number' && typeof wpsWithCoords[i].lat === 'number' && typeof wpsWithCoords[i].lon === 'number') {
        distance += haversine(wpsWithCoords[i - 1].lat!, wpsWithCoords[i - 1].lon!, wpsWithCoords[i].lat!, wpsWithCoords[i].lon!);
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
    // Batch metar/taf updates
    setMetarData(metar);
    setTafData(taf);
    setIsLoading(false);

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

      // Remove or comment out setWeatherData if present
      // setWeatherData(weather);
      // setMetarData(weather.metar ? { [wpsWithCoords[0].icao]: weather.metar } : {});
      // setTafData(weather.taf ? { [wpsWithCoords[0].icao]: weather.taf } : {});

      // Parse user-entered alternates
      const userAlternateICAOs = alternateInputs
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

      // Fetch lat/lon for user alternates
      const userAltsWithCoords = await Promise.all(
        userAlternateICAOs.map(async icao => {
          const coords = await fetchWaypointLatLon(icao);
          return coords ? { icao, ...coords } : null;
        })
      );
      const validUserAlts = userAltsWithCoords.filter(Boolean) as { icao: string, lat: number, lon: number }[];
      setUserAlternates(validUserAlts.map(a => ({ icao: a.icao, name: a.icao, distance: 0, bearing: 0, lat: a.lat, lon: a.lon })));

      // Fetch weather for user alternates
      await Promise.all(validUserAlts.map(async (alt) => {
        const weather = await fetchWeatherData(alt.icao);
        metar[alt.icao] = weather.metar;
        taf[alt.icao] = weather.taf;
      }));

      // Find calculated alternates for the destination
      const destination = wpsWithCoords[wpsWithCoords.length - 1];
      let calcAlts: AlternateAirport[] = [];
      if (destination.lat && destination.lon) {
        const found = await findAlternates(destination.icao, destination.lat, destination.lon);
        calcAlts = found;
        setCalculatedAlternates(calcAlts);
        // Fetch weather for calculated alternates
        await Promise.all(calcAlts.map(async (alt) => {
          const weather = await fetchWeatherData(alt.icao);
          metar[alt.icao] = weather.metar;
          taf[alt.icao] = weather.taf;
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate route';
      setError(errorMessage);
      setRouteError(errorMessage);
    }
  }, [routeWaypoints, cruiseSpeed, onRouteSelect, setCurrentRoute, setRouteError]);

  const findAlternates = async (destinationIcao: string, destLat: number, destLon: number) => {
    try {
      const nearbyAirports = await fetchNearestAirports(destLat, destLon, destinationIcao);
      const alternates: AlternateAirport[] = nearbyAirports
        .filter((airport: any) => {
          const aptLat = airport.geometry?.coordinates?.[1];
          const aptLon = airport.geometry?.coordinates?.[0];
          if (typeof aptLat !== 'number' || typeof aptLon !== 'number') return false;
          const distance = haversine(destLat, destLon, aptLat, aptLon);
          return distance <= 100 && airport.icao && airport.icao !== destinationIcao; // Within 100nm
        })
        .map((airport: any) => {
          const aptLat = airport.geometry.coordinates[1];
          const aptLon = airport.geometry.coordinates[0];
          const distance = haversine(destLat, destLon, aptLat, aptLon);
          const brng = bearing(destLat, destLon, aptLat, aptLon);
          return {
            icao: airport.icao,
            name: airport.name || `${airport.icao} Airport`,
            distance: Math.round(distance),
            bearing: Math.round(brng),
            lat: aptLat,
            lon: aptLon
          };
        })
        .sort((a: AlternateAirport, b: AlternateAirport) => a.distance - b.distance)
        .slice(0, 5); // Top 5 closest alternates
      setAlternateAirports(alternates);
      return alternates;
    } catch (error) {
      console.error('Error finding alternates:', error);
      setAlternateAirports([]);
      return [];
    }
  };

  const position: LatLngExpression = routeWaypoints.length > 0 && routeWaypoints[0].lat && routeWaypoints[0].lon
    ? [routeWaypoints[0].lat, routeWaypoints[0].lon]
    : [49.91, -97.24];

  const positions = routeWaypoints.filter(wp => wp.lat && wp.lon).map(wp => [wp.lat!, wp.lon!] as [number, number]);

  const [validation, setValidation] = useState<boolean[]>([true, true]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedRoute, setSuggestedRoute] = useState<Route | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    metar: true,
    taf: false,
    gfa: false,
    sigmet: false,
    airmet: false,
    alternates: false
  });
  const [showAlternates, setShowAlternates] = useState(false);
  const [alternateAirports, setAlternateAirports] = useState<AlternateAirport[]>([]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      <main className="flex flex-1 w-full container mx-auto max-w-7xl px-4 pt-24 gap-4 items-stretch" style={{ minHeight: 'calc(100vh - 80px)' }}>
        {/* Left Sidebar - Route Planning */}
        <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-y-auto rounded-lg shadow-md">
          {/* Route Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <RouteIcon className="w-5 h-5 mr-2" />
              Route
            </h2>
            
            {/* From */}
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-2">From</label>
              <input
                ref={el => inputRefs.current[0] = el}
                type="text"
                value={localInputs[0] || ''}
                onChange={(e) => handleInputChange(0, e.target.value)}
                onBlur={() => handleInputBlur(0)}
                maxLength={4}
                className={`w-full bg-gray-100 border ${validation[0] === false ? 'border-red-500' : 'border-gray-200'} rounded-lg px-3 py-2 text-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="ICAO"
              />
            </div>

            {/* Add Waypoint Button */}
            <div className="mb-4 flex justify-center">
              <button
                onClick={addWaypoint}
                className="flex items-center space-x-2 text-blue-500 hover:text-blue-400 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Waypoint</span>
              </button>
            </div>

            {/* Intermediate Waypoints */}
            {routeWaypoints.slice(1, -1).map((wp, idx) => (
              <div key={idx + 1} className="mb-4 flex items-center space-x-2">
                <input
                  ref={el => inputRefs.current[idx + 1] = el}
                  type="text"
                  value={localInputs[idx + 1] || ''}
                  onChange={(e) => handleInputChange(idx + 1, e.target.value)}
                  onBlur={() => handleInputBlur(idx + 1)}
                  maxLength={4}
                  className={`flex-1 bg-gray-100 border ${validation[idx + 1] === false ? 'border-red-500' : 'border-gray-200'} rounded-lg px-3 py-2 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="ICAO"
                />
                <button
                  onClick={() => removeWaypoint(idx + 1)}
                  className="text-red-500 hover:text-red-400"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* To */}
            <div className="mb-6">
              <label className="block text-sm text-gray-500 mb-2">To</label>
              <input
                ref={el => inputRefs.current[routeWaypoints.length - 1] = el}
                type="text"
                value={localInputs[routeWaypoints.length - 1] || ''}
                onChange={(e) => handleInputChange(routeWaypoints.length - 1, e.target.value)}
                onBlur={() => handleInputBlur(routeWaypoints.length - 1)}
                maxLength={4}
                className={`w-full bg-gray-100 border ${validation[routeWaypoints.length - 1] === false ? 'border-red-500' : 'border-gray-200'} rounded-lg px-3 py-2 text-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="ICAO"
              />
            </div>

            {/* Alternate Airports Input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-2">Alternate Airport(s)</label>
              <input
                type="text"
                value={alternateInputs}
                onChange={handleAlternateInputChange}
                onBlur={handleAlternateInputBlur}
                placeholder="ICAO, ICAO, ..."
                className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-xs text-gray-400">Comma-separated ICAO codes</span>
            </div>

            {/* Find Route Button */}
            <button
              onClick={findRoute}
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {isLoading ? 'Finding Route...' : 'Find Route'}
            </button>

            {/* Route Summary */}
            {routeData && (
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Distance:</span>
                  <span className="font-mono">{routeData.distance} nm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">ETE:</span>
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
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">Route Details</h3>
              <div className="space-y-2">
                {routeWaypoints.map((wp, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2">
                    <div>
                      <div className="font-mono text-sm">{wp.icao}</div>
                      <div className="text-xs text-gray-500">
                        {idx === 0 ? 'From' : idx === routeWaypoints.length - 1 ? 'To' : 'Via'}
                      </div>
                    </div>
                    {wp.lat && wp.lon && (
                      <div className="text-xs text-gray-500 font-mono">
                        {wp.lat.toFixed(2)}, {wp.lon.toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternates Section */}
          {alternateAirports.length > 0 && (
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                Alternate Airports
              </h3>
              <div className="space-y-2">
                {alternateAirports.map((alt) => (
                  <div key={alt.icao} className="bg-gray-100 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono text-sm font-semibold">{alt.icao}</div>
                        <div className="text-xs text-gray-500 truncate">{alt.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">{alt.distance} nm</div>
                        <div className="text-xs text-gray-500">{alt.bearing}°</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showAlternates}
                    onChange={(e) => setShowAlternates(e.target.checked)}
                    className="rounded border-gray-200 bg-gray-100 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">Show on map</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Center - Map */}
        <div className="flex-1 flex items-stretch justify-center">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center">
              <MapContainer 
                center={position} 
                zoom={6} 
                scrollWheelZoom={true}
                className="w-full h-full min-h-[400px]"
                style={{ height: '100%', minHeight: '400px' }}
                attributionControl={false}
              >
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Dark">
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution=""
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Satellite">
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution=""
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.Overlay name="Weather Radar">
                    <TileLayer
                      url="https://tilecache.rainviewer.com/v2/radar/{z}/{x}/{y}/256/6/1_1.png"
                      attribution=""
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
                
                {routeWaypoints.map((wp, idx) =>
                  wp.lat && wp.lon ? (
                    <Marker key={wp.icao + idx} position={[wp.lat, wp.lon]}>
                      <Popup>
                        <div className="text-slate-900">
                          <div className="font-mono font-semibold">{wp.icao}</div>
                          <div className="text-sm">
                            {idx === 0 ? 'Departure' : idx === routeWaypoints.length - 1 ? 'Destination' : 'Waypoint'}
                          </div>
                          <div className="text-xs mt-1">
                            {wp.lat.toFixed(4)}, {wp.lon.toFixed(4)}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null
                )}

                {/* Show alternate airports if enabled */}
                {showAlternates && alternateAirports.map((alt) => (
                  <Marker key={alt.icao} position={[alt.lat, alt.lon]} icon={greenIcon}>
                    <Popup>
                      <div className="text-slate-900">
                        <div className="font-mono font-semibold">{alt.icao}</div>
                        <div className="text-sm">Alternate</div>
                        <div className="text-xs">{alt.name}</div>
                        <div className="text-xs mt-1">
                          {alt.distance} nm, {alt.bearing}°
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Weather */}
        <div className="w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto rounded-lg shadow-md flex flex-col">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
              Weather
              <ChevronRight className="w-5 h-5" />
            </h2>

            {/* METAR Section */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('metar')}
                className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span className="font-medium">METAR</span>
                {expandedSections.metar ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {expandedSections.metar && (
                <div className="mt-2 space-y-3">
                  {routeWaypoints.filter(wp => wp.icao).map((wp) => (
                    <div key={wp.icao} className="bg-gray-100 rounded-lg p-3">
                      <div className="font-mono text-sm font-semibold mb-2">{wp.icao}</div>
                      <div className="text-xs text-gray-500 font-mono leading-relaxed">
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
                className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span className="font-medium">TAF</span>
                {expandedSections.taf ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {expandedSections.taf && (
                <div className="mt-2 space-y-3">
                  {routeWaypoints.filter(wp => wp.icao).map((wp) => (
                    <div key={wp.icao} className="bg-gray-100 rounded-lg p-3">
                      <div className="font-mono text-sm font-semibold mb-2">{wp.icao}</div>
                      <div className="text-xs text-gray-500 font-mono leading-relaxed">
                        {tafData[wp.icao]?.raw || tafData[wp.icao]?.text || 'No TAF available'}
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
                className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span className="font-medium">GFA</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* SIGMET Section */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('sigmet')}
                className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span className="font-medium">SIGMET</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* AIRMET Section */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('airmet')}
                className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span className="font-medium">AIRMET</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RoutePlanner;