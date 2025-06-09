import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import Header from './components/Header';
import FavoritesBar from './components/FavoritesBar';
import WeatherDisplay from './components/WeatherDisplay';
import GFADisplay from './components/GFADisplay';
import NotamDisplay from './components/NotamDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import useStore from './store';
import { fetchWeatherData, fetchStationData, fetchOpenAipAirport, fetchNearestAirports } from './services/weatherApi';
import RadarDisplay from './components/RadarDisplay';
import { Plane, Play, Pause } from 'lucide-react';
import WeatherCameras from './components/WeatherCameras';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Routes, Route, useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl, GeoJSON } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection } from 'geojson';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

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

function App() {
  const { 
    selectedStations, 
    weatherData, 
    setWeatherData,
    setSelectedStations,
    addToRecentSearches,
    error,
    clearError,
    setError
  } = useStore();

  // Remove old useQuery logic; fetching is now handled in SearchBar for all stations
  const isLoading = useStore(state => state.isLoading);

  // Quick Start logic
  const quickStartAirports = ['KJFK', 'KLAX', 'EGLL', 'KSFO', 'KORD', 'CYYZ', 'CYVR', 'CYUL', 'CYWG', 'CYOW'];
  const shuffledAirports = React.useMemo(() => {
    const arr = [...quickStartAirports];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 5);
  }, []);

  const handleQuickStart = async (icao: string) => {
    try {
      // Fetch both station and weather data together
      const [stationData, weatherData] = await Promise.all([
        fetchStationData(icao),
        fetchWeatherData(icao)
      ]);
      setWeatherData(icao, weatherData);
      setSelectedStations([stationData]);
      addToRecentSearches(stationData);
    } catch (error) {
      setError(`Unable to find weather data for ${icao}`);
    }
  };

  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showNotams, setShowNotams] = useState(true);

  // Surface type mapping for OpenAIP mainComposite codes
  const surfaceTypeMap: Record<number, string> = {
    0: 'Asphalt',
    1: 'Concrete',
    2: 'Grass',
    3: 'Gravel',
    4: 'Dirt',
    5: 'Water',
    6: 'Snow',
    7: 'Ice',
    8: 'Sand',
    9: 'Other',
  };

  // Placeholder for the new detailed airport info page
  function AirportDetailsPage() {
    const { icao } = useParams();
    const [airport, setAirport] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [nearestAirports, setNearestAirports] = React.useState<any[]>([]);

    useEffect(() => {
      if (!icao) return;
      setLoading(true);
      fetchOpenAipAirport(icao)
        .then(data => {
          setAirport(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }, [icao]);

    // Fetch nearest airports after airport is loaded
    React.useEffect(() => {
      if (airport?.geometry?.coordinates) {
        fetchNearestAirports(
          airport.geometry.coordinates[1],
          airport.geometry.coordinates[0],
          airport.icao
        ).then(setNearestAirports);
      }
    }, [airport]);

    const position: LatLngExpression = airport?.geometry?.coordinates
      ? [airport.geometry.coordinates[1], airport.geometry.coordinates[0]]
      : [49.91, -97.24];

    // Tab scroll handler
    const handleTabClick = (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    // Helper: Haversine formula for distance (km)
    function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
      const R = 6371; // km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }
    // Helper: Bearing
    function bearing(lat1: number, lon1: number, lat2: number, lon2: number) {
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
      const x =
        Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
        Math.sin((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.cos(dLon);
      let brng = (Math.atan2(y, x) * 180) / Math.PI;
      brng = (brng + 360) % 360;
      return Math.round(brng);
    }

    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl" style={{ scrollBehavior: 'smooth' }}>
        <h1 className="text-2xl font-bold mb-4">Airport Details</h1>
        {/* Tabbed navigation */}
        <nav className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <ul className="flex flex-wrap gap-2 sm:gap-4 text-sm sm:text-base font-medium">
            <li><button className="py-2 px-3 hover:underline" onClick={() => handleTabClick('overview')}>Overview</button></li>
            <li><button className="py-2 px-3 hover:underline" onClick={() => handleTabClick('runways')}>Runways</button></li>
            <li><button className="py-2 px-3 hover:underline" onClick={() => handleTabClick('map')}>Map</button></li>
            <li><button className="py-2 px-3 hover:underline" onClick={() => handleTabClick('frequencies')}>Frequencies</button></li>
            <li><button className="py-2 px-3 hover:underline" onClick={() => handleTabClick('services')}>Services</button></li>
            {/* Add more tabs as needed */}
          </ul>
        </nav>
        {loading ? (
          <div className="p-6 text-center">Loading airport information...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">{error}</div>
        ) : airport ? (
          <>
            {/* Overview Section */}
            <section id="overview" className="scroll-mt-24">
              <div className="card mb-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">{airport.name}</h2>
                    <div className="text-gray-600 dark:text-gray-400 mb-1">
                      {airport.location?.city ? airport.location.city : ''}
                      {airport.location?.city && airport.location?.country ? ', ' : ''}
                      {airport.location?.country ? airport.location.country : ''}
                    </div>
                    <div className="text-sm text-gray-500">ICAO: {airport.icao || '-'}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    <div>Coordinates: {position[0].toFixed(4)}, {position[1].toFixed(4)}</div>
                    <div>Elevation: {
                      airport.elevation?.value && typeof airport.elevation.value === 'number'
                        ? `${Math.round(airport.elevation.value * 3.28084)} ft`
                        : '-'
                    }</div>
                    <div>Timezone: {airport.timezone || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </section>
            {/* Runways Section */}
            <section id="runways" className="scroll-mt-24 mb-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-2">Runways</h3>
                {airport.runways && airport.runways.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          <th className="px-3 py-2 text-left">Designator</th>
                          <th className="px-3 py-2 text-left">True Heading</th>
                          <th className="px-3 py-2 text-left">Length (ft)</th>
                          <th className="px-3 py-2 text-left">Width (ft)</th>
                          <th className="px-3 py-2 text-left">Surface</th>
                        </tr>
                      </thead>
                      <tbody>
                        {airport.runways.map((rwy: any, idx: number) => (
                          <tr key={rwy.designator || idx} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-3 py-2 font-mono">{rwy.designator || '-'}</td>
                            <td className="px-3 py-2">{typeof rwy.trueHeading === 'number' ? `${rwy.trueHeading}°` : '-'}</td>
                            <td className="px-3 py-2">{
                              rwy.dimension && rwy.dimension.length && typeof rwy.dimension.length.value === 'number'
                                ? Math.round(rwy.dimension.length.value * 3.28084)
                                : '-'
                            }</td>
                            <td className="px-3 py-2">{
                              rwy.dimension && rwy.dimension.width && typeof rwy.dimension.width.value === 'number'
                                ? Math.round(rwy.dimension.width.value * 3.28084)
                                : '-'
                            }</td>
                            <td className="px-3 py-2">{
                              rwy.surface && typeof rwy.surface.mainComposite === 'number'
                                ? surfaceTypeMap[rwy.surface.mainComposite] || '-'
                                : '-'
                            }</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-gray-500">No runway data available.</div>
                )}
              </div>
            </section>
            {/* Map Section */}
            <section id="map" className="scroll-mt-24 mb-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-2">Map</h3>
                <MapContainer center={position} zoom={13} scrollWheelZoom={true}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  <Marker position={position}>
                    <Popup>
                      {airport.name}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </section>
            {/* Frequencies Section */}
            <section id="frequencies" className="scroll-mt-24 mb-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-2">Frequencies</h3>
                {airport.frequencies && airport.frequencies.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">Frequency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {airport.frequencies.map((freq: any, idx: number) => (
                          <tr key={freq.type + freq.value + idx} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-3 py-2">{freq.name || '-'}</td>
                            <td className="px-3 py-2 font-mono">{freq.value || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-gray-500">No frequency data available.</div>
                )}
              </div>
            </section>
            {/* Services Section */}
            <section id="services" className="scroll-mt-24 mb-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-2">Services</h3>
                {airport.services ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                      <tbody>
                        {Object.entries(airport.services).map(([key, value]: [string, any]) => (
                          <tr key={key} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-3 py-2 font-semibold capitalize">{key.replace(/_/g, ' ')}</td>
                            <td className="px-3 py-2">{typeof value === 'string' || typeof value === 'number' ? value : value ? JSON.stringify(value) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-gray-500">No services data available.</div>
                )}
              </div>
            </section>
            {/* Nearest Airports Section */}
            <section id="nearest-airports" className="scroll-mt-24 mb-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-2">Nearest Airports</h3>
                {nearestAirports.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Runway</th>
                          <th className="px-3 py-2 text-left">Frequency</th>
                          <th className="px-3 py-2 text-left">Bearing / Distance</th>
                          <th className="px-3 py-2 text-left">View</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nearestAirports.map((apt: any, idx: number) => {
                          // Name: ICAO bolded if present
                          const name = apt.icao ? <b>{apt.icao}</b> + ' ' + (apt.name || '') : (apt.name || '-');
                          // Runway: show longest or summary
                          let runway = '-';
                          if (apt.runways && apt.runways.length > 0) {
                            const longest = apt.runways.reduce((a: any, b: any) => {
                              const aLen = a.dimension?.length?.value || 0;
                              const bLen = b.dimension?.length?.value || 0;
                              return aLen > bLen ? a : b;
                            });
                            if (longest.dimension?.length?.value && longest.dimension?.width?.value) {
                              runway = `${longest.dimension.length.value} m x ${longest.dimension.width.value} m`;
                              if (longest.surface && typeof longest.surface.mainComposite === 'number') {
                                runway += ' ' + (surfaceTypeMap[longest.surface.mainComposite] || '');
                              }
                            }
                          }
                          // Frequency: show first or primary
                          let freq = '-';
                          if (apt.frequencies && apt.frequencies.length > 0) {
                            const primary = apt.frequencies.find((f: any) => f.primary) || apt.frequencies[0];
                            freq = primary.value ? `${primary.value} MHz` : '-';
                          }
                          // Bearing/Distance
                          let bearingDist = '-';
                          if (airport?.geometry?.coordinates && apt.geometry?.coordinates) {
                            const dist = haversine(
                              airport.geometry.coordinates[1],
                              airport.geometry.coordinates[0],
                              apt.geometry.coordinates[1],
                              apt.geometry.coordinates[0]
                            );
                            const brng = bearing(
                              airport.geometry.coordinates[1],
                              airport.geometry.coordinates[0],
                              apt.geometry.coordinates[1],
                              apt.geometry.coordinates[0]
                            );
                            bearingDist = `${brng}°/ ${dist.toFixed(2)} km`;
                          }
                          return (
                            <tr key={apt.icao || apt._id || idx} className="border-t border-gray-200 dark:border-gray-700">
                              <td className="px-3 py-2">{name}</td>
                              <td className="px-3 py-2">{runway}</td>
                              <td className="px-3 py-2">{freq}</td>
                              <td className="px-3 py-2">{bearingDist}</td>
                              <td className="px-3 py-2">
                                {apt.icao ? (
                                  <button
                                    className="text-blue-600 hover:underline"
                                    onClick={() => window.location.href = `/airport/${apt.icao}`}
                                  >
                                    View
                                  </button>
                                ) : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-gray-500">No nearby airports found.</div>
                )}
              </div>
            </section>
          </>
        ) : null}
        <p>Detailed airport information will appear here.</p>
      </div>
    );
  }

  function RoutePlannerPage() {
    const [route, setRoute] = React.useState('');
    const [alternates, setAlternates] = React.useState('');
    const [submittedRoute, setSubmittedRoute] = React.useState<string[]>([]);
    const [submittedAlternates, setSubmittedAlternates] = React.useState<string[]>([]);
    const [stations, setStations] = React.useState<any[]>([]);
    const [alternateStations, setAlternateStations] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [showRadar, setShowRadar] = React.useState(true);
    const [radarFrame, setRadarFrame] = React.useState(0);
    const [radarTimestamps, setRadarTimestamps] = React.useState<number[]>([]);
    const [sigmetData, setSigmetData] = React.useState<any>(null);
    const [airmetData, setAirmetData] = React.useState<any>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);

    // Fetch RainViewer radar timestamps on mount
    React.useEffect(() => {
      fetch('https://api.rainviewer.com/public/weather-maps.json')
        .then(res => res.json())
        .then(data => {
          if (data && data.radar && data.radar.past) {
            setRadarTimestamps(data.radar.past.map((f: any) => f.time));
          }
        });
    }, []);

    // Fetch SIGMET and AIRMET GeoJSON overlays (replace with your real endpoint if available)
    React.useEffect(() => {
      fetch('/api/weather-reports?type=sigmet&icao=ALL')
        .then(res => res.json())
        .then(data => setSigmetData(data));
      fetch('/api/weather-reports?type=airmet&icao=ALL')
        .then(res => res.json())
        .then(data => setAirmetData(data));
    }, []);

    // Radar animation effect
    React.useEffect(() => {
      if (!isPlaying || radarTimestamps.length === 0) return;
      const interval = setInterval(() => {
        setRadarFrame((prev) => (prev + 1) % radarTimestamps.length);
      }, 700);
      return () => clearInterval(interval);
    }, [isPlaying, radarTimestamps]);

    const toggleRadarAnimation = () => setIsPlaying((p) => !p);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const icaos = route
        .toUpperCase()
        .split(/[^A-Z0-9]+/)
        .map(code => code.trim())
        .filter(code => code.length === 4);
      const altIcaos = alternates
        .toUpperCase()
        .split(/[^A-Z0-9]+/)
        .map(code => code.trim())
        .filter(code => code.length === 4);
      setSubmittedRoute(icaos);
      setSubmittedAlternates(altIcaos);
      setLoading(true);
      // Fetch station data for each ICAO
      const results = await Promise.all(
        icaos.map(async (icao) => {
          try {
            const station = await fetchStationData(icao);
            const weather = await fetchWeatherData(icao);
            return { ...station, weather };
          } catch {
            return null;
          }
        })
      );
      setStations(results.filter(Boolean));
      // Fetch alternates
      const altResults = await Promise.all(
        altIcaos.map(async (icao) => {
          try {
            const station = await fetchStationData(icao);
            const weather = await fetchWeatherData(icao);
            return { ...station, weather };
          } catch {
            return null;
          }
        })
      );
      setAlternateStations(altResults.filter(Boolean));
      setLoading(false);
    };

    // Get route coordinates for map
    const routeCoords: LatLngExpression[] = stations
      .filter(s => typeof s.latitude === 'number' && typeof s.longitude === 'number')
      .map(s => [s.latitude, s.longitude]);

    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <h1 className="text-2xl font-bold mb-4">Route Planner</h1>
        <form onSubmit={handleSubmit} className="mb-6">
          <label className="block mb-2 font-semibold">Enter route (ICAO codes separated by space or comma):</label>
          <input
            type="text"
            className="input w-full max-w-lg mb-2"
            placeholder="CYWG YWG V300 YQT CYQT"
            value={route}
            onChange={e => setRoute(e.target.value)}
          />
          <label className="block mb-2 font-semibold mt-4">Enter alternate airports (ICAO codes separated by space or comma):</label>
          <input
            type="text"
            className="input w-full max-w-lg mb-2"
            placeholder="CYQT CYYZ"
            value={alternates}
            onChange={e => setAlternates(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded shadow transition-colors text-sm">Plan Route</button>
        </form>
        {loading && <div className="p-4 text-center">Loading route data...</div>}
        {stations.length > 0 && !loading && (
          <div className="mb-6">
            <div className="card mb-4">
              <h2 className="text-lg font-semibold mb-2">Route Map</h2>
              <div className="mb-2 flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="flex items-center gap-2 text-white font-medium">
                  <input
                    type="checkbox"
                    checked={showRadar}
                    onChange={e => setShowRadar(e.target.checked)}
                    className="accent-blue-500 w-5 h-5"
                  />
                  Show Radar
                </label>
                {showRadar && radarTimestamps.length > 0 && (
                  <div className="flex items-center gap-3 bg-gray-800 bg-opacity-80 rounded-lg px-3 py-2 shadow">
                    <button
                      type="button"
                      onClick={toggleRadarAnimation}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={radarTimestamps.length - 1}
                      value={radarFrame}
                      onChange={e => setRadarFrame(Number(e.target.value))}
                      className="w-40 accent-blue-500"
                    />
                    <span className="bg-blue-700 text-white rounded-full px-3 py-1 text-xs font-mono">
                      {new Date(radarTimestamps[radarFrame] * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ height: '400px', width: '100%' }}>
                {/* Legend */}
                <div className="absolute z-[1000] left-4 top-4 bg-white bg-opacity-90 rounded shadow px-3 py-2 text-xs flex flex-col gap-1">
                  <div className="flex items-center gap-2"><span className="inline-block w-3 h-5 bg-blue-600 rounded-sm mr-1" style={{ background: 'url("' + markerIcon + '") center/contain no-repeat' }}></span> Route Airport</div>
                  <div className="flex items-center gap-2"><span className="inline-block w-3 h-5 bg-green-600 rounded-sm mr-1" style={{ background: 'url(https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png) center/contain no-repeat' }}></span> Alternate</div>
                </div>
                <MapContainer center={routeCoords[0] || [49.91, -97.24]} zoom={5} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                  <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="OpenStreetMap">
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="CartoDB Dark Matter">
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution="&copy; CartoDB"
                      />
                    </LayersControl.BaseLayer>
                    {showRadar && radarTimestamps.length > 0 && (
                      <LayersControl.Overlay checked name="Radar (RainViewer)">
                        <TileLayer
                          url={`https://tilecache.rainviewer.com/v2/radar/${radarTimestamps[radarFrame]}/256/{z}/{x}/{y}/2/1_1.png`}
                          attribution="Radar &copy; RainViewer"
                          opacity={0.6}
                        />
                      </LayersControl.Overlay>
                    )}
                    {sigmetData && Array.isArray(sigmetData) && sigmetData.length > 0 && (
                      <LayersControl.Overlay name="SIGMETs">
                        <GeoJSON data={{ type: 'FeatureCollection', features: sigmetData } as FeatureCollection} style={{ color: 'red', weight: 2, fillOpacity: 0.2 }} />
                      </LayersControl.Overlay>
                    )}
                    {airmetData && Array.isArray(airmetData) && airmetData.length > 0 && (
                      <LayersControl.Overlay name="AIRMETs">
                        <GeoJSON data={{ type: 'FeatureCollection', features: airmetData } as FeatureCollection} style={{ color: 'orange', weight: 2, fillOpacity: 0.2 }} />
                      </LayersControl.Overlay>
                    )}
                  </LayersControl>
                  {/* Route markers (default icon) */}
                  {routeCoords.map((pos, idx) => (
                    <Marker key={idx} position={pos}>
                      <Popup>
                        {stations[idx]?.icao || ''}<br />
                        {stations[idx]?.name || ''}
                      </Popup>
                    </Marker>
                  ))}
                  {/* Alternate markers (green icon) */}
                  {alternateStations
                    .filter(s => typeof s.latitude === 'number' && typeof s.longitude === 'number')
                    .map((s, idx) => (
                      <Marker key={s.icao || idx} position={[s.latitude, s.longitude]} icon={greenIcon}>
                        <Popup>
                          {s.icao}<br />
                          {s.name}
                          <div className="text-xs text-gray-500">Alternate</div>
                        </Popup>
                      </Marker>
                    ))}
                  {routeCoords.length > 1 && <Polyline positions={routeCoords} color="blue" />}
                </MapContainer>
              </div>
            </div>
            <div className="card mb-4">
              <h2 className="text-lg font-semibold mb-2">Route Weather & NOTAMs</h2>
              <ul>
                {stations.map((s, idx) => (
                  <li key={s.icao || idx} className="mb-4">
                    <b>{s.icao}</b> {s.name && `- ${s.name}`}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {s.weather?.metar?.raw ? (
                        <div>METAR: {s.weather.metar.raw}</div>
                      ) : (
                        <div>No METAR available</div>
                      )}
                      {s.weather?.taf?.raw ? (
                        <div>TAF: {s.weather.taf.raw}</div>
                      ) : (
                        <div>No TAF available</div>
                      )}
                      {s.weather?.notam ? (
                        <div>NOTAMs: {Array.isArray(s.weather.notam) ? s.weather.notam.join('; ') : s.weather.notam}</div>
                      ) : (
                        <div>No NOTAMs available</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {alternateStations.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold mb-2">Alternate Airports Weather & NOTAMs</h2>
                <ul>
                  {alternateStations.map((s, idx) => (
                    <li key={s.icao || idx} className="mb-4">
                      <b>{s.icao}</b> {s.name && `- ${s.name}`}
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {s.weather?.metar?.raw ? (
                          <div>METAR: {s.weather.metar.raw}</div>
                        ) : (
                          <div>No METAR available</div>
                        )}
                        {s.weather?.taf?.raw ? (
                          <div>TAF: {s.weather.taf.raw}</div>
                        ) : (
                          <div>No TAF available</div>
                        )}
                        {s.weather?.notam ? (
                          <div>NOTAMs: {Array.isArray(s.weather.notam) ? s.weather.notam.join('; ') : s.weather.notam}</div>
                        ) : (
                          <div>No NOTAMs available</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Header />
        <nav className="container mx-auto px-2 sm:px-4 py-2 max-w-7xl flex gap-4">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/route-planner" className="hover:underline">Route Planner</Link>
        </nav>
        <Routes>
          <Route path="/" element={
            <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
              <div className="print:hidden">
                <FavoritesBar />
              </div>
              {error && (
                <div className="mb-4 sm:mb-6">
                  <ErrorMessage 
                    message={error} 
                    onDismiss={clearError} 
                  />
                </div>
              )}
              {isLoading ? (
                <LoadingSpinner />
              ) : selectedStations && selectedStations.length > 0 ? (
                <div className="space-y-6 sm:space-y-12 mb-4 sm:mb-8">
                  {selectedStations.map(station => (
                    <div key={station.icao} className="flex flex-col gap-3 sm:gap-4 w-full">
                      {weatherData[station.icao] && (
                        <WeatherDisplay 
                          weatherData={weatherData[station.icao]}
                          station={station}
                          lastUpdated={weatherData[station.icao].lastUpdated}
                          showNotams={showNotams}
                          setShowNotams={setShowNotams}
                        />
                      )}
                      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                        <div className="flex-1">
                          {showNotams && <NotamDisplay icao={station.icao} />}
                        </div>
                        <div className="flex flex-col flex-1 gap-3 sm:gap-4">
                          <GFADisplay icao={station.icao} />
                          <RadarDisplay icao={station.icao} />
                          <WeatherCameras icao={station.icao} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-2 sm:px-4">
                  <div className="flex flex-col items-center">
                    <div className="mb-3 sm:mb-4">
                      <Plane size={40} className="text-primary-500 mx-auto sm:w-12 sm:h-12" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center">Welcome to AviWeather</h2>
                    <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto text-base sm:text-lg mb-4 sm:mb-6 text-center px-2">
                      Search for an airport using its ICAO code to get the latest aviation weather information including <b>METARs</b>, <b>TAFs</b>, and area forecasts.
                    </p>
                    <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg inline-block w-full max-w-md">
                      <p className="text-lg sm:text-xl font-semibold mb-2">Quick Start</p>
                      <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-3">Try searching for these popular airports:</p>
                      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                        {shuffledAirports.map(icao => (
                          <button
                            key={icao}
                            className="px-2 sm:px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded text-xs sm:text-sm font-mono transition-colors shadow-sm"
                            onClick={() => handleQuickStart(icao)}
                          >
                            {icao}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          } />
          <Route path="/airport/:icao" element={<AirportDetailsPage />} />
          <Route path="/route-planner" element={<RoutePlannerPage />} />
        </Routes>
        <footer className="bg-white dark:bg-gray-900 shadow-sm border-t border-gray-200 dark:border-gray-800 mt-auto">
          <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
            {showDisclaimer && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-lg p-4 sm:p-6 relative">
                  <button
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
                    onClick={() => setShowDisclaimer(false)}
                    aria-label="Close disclaimer"
                  >
                    &times;
                  </button>
                  <div className="font-semibold mb-2 text-base sm:text-lg">Legal Disclaimer</div>
                  <p className="mb-2 text-xs sm:text-sm text-gray-800 dark:text-gray-100">
                    The information provided on this app is for general informational purposes only. AviWeather (or any associated person) is not responsible for any inaccuracy. Always get a proper flight briefing from your local FIC and/or fact check all information displayed with official sources!
                  </p>
                  <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-100">
                    Please be aware that any information you may find here may be inaccurate or misleading. Use of information displayed is at your own risk.
                  </p>
                </div>
              </div>
            )}
            <div className="text-center text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 flex flex-col md:flex-row items-center justify-center gap-1 sm:gap-2">
              <span>All aviation data displayed belong to <a href="https://www.navcanada.ca/" target="_blank" rel="noopener noreferrer" className="underline">NAV CANADA</a></span>
              <span className="hidden md:inline">-</span>
              <button className="underline cursor-pointer bg-transparent border-0 p-0 m-0 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400" style={{textDecoration: 'underline'}} onClick={() => setShowDisclaimer(true)}>
                Legal Disclaimer
              </button>
              <span className="ml-0 md:ml-2">Version 1.0.0</span>
            </div>
          </div>
        </footer>
      </div>
      <SpeedInsights />
    </>
  );
}

export default App;