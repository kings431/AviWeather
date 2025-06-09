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
import dynamic from 'next/dynamic';
import RouteInputPanel from './RouteInputPanel';
import RouteSummaryPanel from './RouteSummaryPanel';
import RouteMapPanel from './RouteMapPanel';

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

const OPENWEATHER_API_KEY = 'c4946a82d8310d8fba50607b5bc66d82';

// --- Isolated fetchers for route planner ---
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
async function fetchTaf(icao: string) {
  const res = await fetch(`/api/taf?icao=${icao}`);
  return res.ok ? res.json() : null;
}
async function fetchNotam(icao: string) {
  const res = await fetch(`/api/notam?icao=${icao}`);
  return res.ok ? res.json() : null;
}
async function fetchGfaLinks(icao: string) {
  // Example: return array of GFA chart URLs for the region
  return [`https://flightplanning.navcanada.ca/gfa/gfa_${icao}.png`];
}
async function fetchSigmetAirmet(icao: string) {
  // Example: return array of SIGMET/AIRMET objects
  return [];
}
async function fetchPireps(icao: string) {
  // Example: return array of PIREP objects
  return [];
}
async function fetchWeatherCam(icao: string) {
  // Example: return { image, url }
  return null;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({ onRouteSelect }) => {
  console.log('RoutePlanner render');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { icao: '' }, // Departure
    { icao: '' }, // Arrival
  ]);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [metarData, setMetarData] = useState<Record<string, any>>({});
  const [tafData, setTafData] = useState<Record<string, any>>({});
  const [notamData, setNotamData] = useState<Record<string, any>>({});
  const [gfaLinks, setGfaLinks] = useState<string[][]>([]);
  const [sigmetData, setSigmetData] = useState<any[][]>([]);
  const [airmetData, setAirmetData] = useState<any[][]>([]);
  const [pirepData, setPirepData] = useState<any[][]>([]);
  const [weatherCams, setWeatherCams] = useState<Record<string, { image: string; url: string }>>({});
  const [validation, setValidation] = useState<boolean[]>([true, true]);
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
  const [weatherToggles, setWeatherToggles] = useState<WeatherToggleType[]>(['METAR', 'TAF', 'NOTAM']);

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

  const handleVoiceInput = (icao: string) => {
    if (!('webkitSpeechRecognition' in window)) return alert('Voice input not supported');
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.replace(/\s/g, '').toUpperCase();
      if (/^[A-Z0-9]{4}$/.test(transcript)) {
        const idx = waypoints.findIndex(wp => wp.icao === icao);
        if (idx !== -1) handleWaypointChange(idx, transcript);
      }
    };
    recognition.start();
  };

  const findRoute = async () => {
    setLoading(true);
    setError(null);
    // Validate ICAOs
    const valid = waypoints.map(wp => /^[A-Z0-9]{4}$/.test(wp.icao));
    setValidation(valid);
    if (valid.some(v => !v)) { setLoading(false); return; }
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
    // Calculate distance (great-circle) and ETE (assume 120kt)
    let distance = 0;
    for (let i = 1; i < wpsWithCoords.length; i++) {
      if (typeof wpsWithCoords[i - 1].lat === 'number' && typeof wpsWithCoords[i - 1].lon === 'number' && typeof wpsWithCoords[i].lat === 'number' && typeof wpsWithCoords[i].lon === 'number') {
        distance += haversine(wpsWithCoords[i - 1] as { lat: number; lon: number }, wpsWithCoords[i] as { lat: number; lon: number });
      }
    }
    const ete = Math.round(distance / 120 * 60);
    setRouteData({ waypoints: wpsWithCoords, distance: Math.round(distance), ete });
    // Fetch all weather data for each waypoint
    const metar: Record<string, any> = {};
    const taf: Record<string, any> = {};
    const notam: Record<string, any> = {};
    const gfa: string[][] = [];
    const sigmet: any[][] = [];
    const airmet: any[][] = [];
    const pirep: any[][] = [];
    const cams: Record<string, { image: string; url: string }> = {};
    await Promise.all(wpsWithCoords.map(async (wp, idx) => {
      metar[wp.icao] = await fetchMetar(wp.icao);
      taf[wp.icao] = await fetchTaf(wp.icao);
      notam[wp.icao] = await fetchNotam(wp.icao);
      gfa[idx] = await fetchGfaLinks(wp.icao);
      sigmet[idx] = await fetchSigmetAirmet(wp.icao);
      airmet[idx] = await fetchSigmetAirmet(wp.icao); // For demo, same as sigmet
      pirep[idx] = await fetchPireps(wp.icao);
      const cam = await fetchWeatherCam(wp.icao);
      if (cam) cams[wp.icao] = cam;
    }));
    setMetarData(metar);
    setTafData(taf);
    setNotamData(notam);
    setGfaLinks(gfa);
    setSigmetData(sigmet);
    setAirmetData(airmet);
    setPirepData(pirep);
    setWeatherCams(cams);
    setLoading(false);

    try {
      const optimizer = RouteOptimizer.getInstance();
      const route = await optimizer.optimizeRoute(wpsWithCoords[0].icao, wpsWithCoords[wpsWithCoords.length - 1].icao, optimizationCriteria);
      console.log('Route calculated', route);
      const estimatedTime = cruiseSpeed > 0 ? Math.round(route.distance / cruiseSpeed * 60) : 0;
      const newRoute = { ...route, estimatedTime };
      setRouteData({
        waypoints: route.waypoints,
        distance: route.distance,
        ete: estimatedTime
      });
      setSuggestedRoute(newRoute);
      onRouteSelect(newRoute);
      setCurrentRoute(newRoute);

      // Fetch weather data for the route
      const weather = await fetchWeatherData(wpsWithCoords[0].icao);
      console.log('Weather fetched', weather);
      setWeatherData(weather);
      setMetarData(weather.METAR);
      setTafData(weather.TAF);
      setNotamData(weather.NOTAM);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate route';
      console.error('Route calculation error', err);
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

  const handleExportGPX = () => {
    const gpx = `<?xml version="1.0"?><gpx version="1.1" creator="AviWeather"><trk><trkseg>${waypoints
      .map(wp => wp.lat && wp.lon ? `<trkpt lat="${wp.lat}" lon="${wp.lon}"><name>${wp.icao}</name></trkpt>` : '')
      .join('')}</trkseg></trk></gpx>`;
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route.gpx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify({ waypoints, routeData }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareRoute = () => {
    const encoded = btoa(JSON.stringify(waypoints.map(wp => wp.icao)));
    const url = `${window.location.origin}/route?data=${encoded}`;
    navigator.clipboard.writeText(url);
    alert('Route URL copied to clipboard!');
  };

  useEffect(() => {
    console.log('[RoutePlanner] suggestedRoute:', suggestedRoute);
  }, [suggestedRoute]);
  useEffect(() => {
    console.log('[RoutePlanner] currentRoute:', useRouteStore.getState().currentRoute);
  }, [useRouteStore.getState().currentRoute]);

  return (
    <div className="flex flex-col md:flex-row w-full h-full min-h-[80vh]">
      {/* Left: Input + Summary */}
      <div className="w-full md:w-1/3 p-4 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col gap-4">
        <RouteInputPanel
          waypoints={waypoints}
          onWaypointChange={handleWaypointChange}
          onAddWaypoint={addWaypoint}
          onRemoveWaypoint={removeWaypoint}
          onFindRoute={findRoute}
          onExportGPX={handleExportGPX}
          onExportJSON={handleExportJSON}
          onVoiceInput={handleVoiceInput}
          onShareRoute={handleShareRoute}
          validation={validation}
        />
        <RouteSummaryPanel
          waypoints={waypoints}
          routeData={routeData}
          selectedMarker={selectedMarker}
          metarData={metarData}
          tafData={tafData}
          notamData={notamData}
          gfaLinks={gfaLinks.flat()}
          sigmetData={sigmetData.flat()}
          airmetData={airmetData.flat()}
          pirepData={pirepData.flat()}
          weatherCams={weatherCams}
          onExportGPX={handleExportGPX}
          onExportJSON={handleExportJSON}
          onShareRoute={handleShareRoute}
        />
        {isLoading && <div className="text-blue-500">Loading route and weather...</div>}
        {error && <div className="text-red-500">{error}</div>}
      </div>
      {/* Right: Map */}
      <div className="w-full md:w-2/3 p-4">
        <RouteMapPanel
          waypoints={waypoints}
          routeData={routeData}
          selectedMarker={selectedMarker}
          onMarkerClick={setSelectedMarker}
          metarData={metarData}
          tafData={tafData}
        />
      </div>
    </div>
  );
};

export default RoutePlanner; 