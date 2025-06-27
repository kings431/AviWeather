import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import Header from './components/Header';
import FavoritesBar from './components/FavoritesBar';
import WeatherDisplay from './components/WeatherDisplay';
import GFADisplay from './components/GFADisplay';
import NotamDisplay from './components/NotamDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import ErrorBoundary from './components/ErrorBoundary';
import useStore from './store';
import { useRouteStore } from './store/routeStore';
import { fetchWeatherData, fetchStationData, fetchOpenAipAirport, fetchNearestAirports } from './services/weatherApi';
import RadarDisplay from './components/RadarDisplay';
import { Plane, Play, Pause } from 'lucide-react';
import WeatherCameras from './components/WeatherCameras';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Routes, Route as RouterRoute, useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl, GeoJSON } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection } from 'geojson';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { FlightCategoryBadge } from './components/MetarDisplay';
import MetarDisplay from './components/MetarDisplay';
import TafDisplay from './components/TafDisplay';
import WeatherBriefing from './components/WeatherBriefing';
import SearchBar from './components/SearchBar';
import StationInfo from './components/StationInfo';
import WeatherReports from './components/WeatherReports';

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

  const {
    currentRoute,
    alternateAirports,
    setCurrentRoute,
    setAlternateAirports,
    setLoading: setRouteLoading,
    setError: setRouteError
  } = useRouteStore();

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
  const [showMetar, setShowMetar] = useState(true);
  const [showTaf, setShowTaf] = useState(true);

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
                  <LayersControl.BaseLayer checked name="OpenStreetMap">
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap contributors"
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="VNC (VFR Navigation Chart)">
                    <TileLayer
                      url="https://wms.chartbundle.com/tms/1.0.0/vfrc/{z}/{x}/{y}.png?api_key=public"
                      attribution="VNC &copy; ChartBundle/Open Data"
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="LO (Low Enroute IFR)">
                    <TileLayer
                      url="https://wms.chartbundle.com/tms/1.0.0/enrl/{z}/{x}/{y}.png?api_key=public"
                      attribution="LO &copy; ChartBundle/Open Data"
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="HIGH (High Enroute IFR)">
                    <TileLayer
                      url="https://wms.chartbundle.com/tms/1.0.0/enrh/{z}/{x}/{y}.png?api_key=public"
                      attribution="HIGH &copy; ChartBundle/Open Data"
                    />
                  </LayersControl.BaseLayer>
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

  function WeatherBriefingPage() {
    // Placeholder for the new Weather Briefing section
    return (
      <div className="container mx-auto px-4 py-8">
        <WeatherBriefing />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      <div className="fixed top-0 left-0 w-full z-20">
        <Header />
        <FavoritesBar />
      </div>
      <main
        className={selectedStations.length === 0 ? 'flex flex-1 items-center justify-center' : ''}
        style={selectedStations.length === 0 ? { minHeight: 'calc(100vh - 154px)' } : {}}
      >
        <Routes>
          <RouterRoute path="/" element={
            selectedStations.length === 0 ? (
              <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-xl p-8 rounded-3xl shadow-xl bg-white/70 dark:bg-gray-900/80 backdrop-blur-md">
                <div className="flex flex-col items-center mb-8">
                  <div className="mb-4">
                    <img src="/logo192.png" alt="AviWeather Logo" className="w-16 h-16 mx-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-extrabold text-center text-blue-900 dark:text-blue-200 mb-2 drop-shadow">Clear skies ahead with</h1>
                  <span className="text-4xl sm:text-5xl font-extrabold text-blue-600 dark:text-blue-400 text-center mb-2 drop-shadow flex items-center gap-2">
                    <span className="inline-block"><svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path fill="#2563eb" d="M2.5 19.5l19-7.5-19-7.5v5l14 2.5-14 2.5v5z"/></svg></span>
                    AviWeather
                  </span>
                  <p className="mb-6 text-lg text-gray-700 dark:text-gray-300 text-center max-w-xl">Modern aviation weather, NOTAMs, and route planning—built for real-world pilots.</p>
                </div>
                <div className="w-full mb-6">
                  <div className="relative w-full max-w-md mx-auto">
                    <SearchBar />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center w-full mb-2">
                  {shuffledAirports.map(icao => (
                    <button
                      key={icao}
                      onClick={() => handleQuickStart(icao)}
                      className="px-6 py-3 bg-white/80 dark:bg-gray-800/80 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold rounded-xl shadow transition text-lg border border-blue-200 dark:border-gray-700"
                    >
                      {icao}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="container mx-auto max-w-4xl px-4 py-8 pt-[110px]">
                <div className="flex flex-wrap gap-4 items-center mb-4 print:hidden">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm">NOTAMs</span>
                    <span className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                      <input type="checkbox" checked={showNotams} onChange={() => setShowNotams(!showNotams)} className="sr-only peer" />
                      <span className="block w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-primary-500 transition" />
                      <span className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-4" />
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm">Show Simplified METAR</span>
                    <span className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                      <input type="checkbox" checked={showMetar} onChange={() => setShowMetar(v => !v)} className="sr-only peer" />
                      <span className="block w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-primary-500 transition" />
                      <span className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-4" />
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm">Show Simplified TAF</span>
                    <span className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                      <input type="checkbox" checked={showTaf} onChange={() => setShowTaf(v => !v)} className="sr-only peer" />
                      <span className="block w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-primary-500 transition" />
                      <span className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-4" />
                    </span>
                  </label>
                </div>
                <StationInfo station={selectedStations[0]} lastUpdated={weatherData[selectedStations[0]?.icao]?.lastUpdated} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="flex flex-col gap-6">
                    {weatherData[selectedStations[0]?.icao]?.metar && (
                      <MetarDisplay data={weatherData[selectedStations[0]?.icao]?.metar!} icao={selectedStations[0]?.icao} hideRaw={showMetar} />
                    )}
                    {showNotams && (
                      <NotamDisplay icao={selectedStations[0]?.icao} />
                    )}
                    <WeatherReports
                      sigmets={weatherData[selectedStations[0]?.icao]?.sigmet}
                      airmets={weatherData[selectedStations[0]?.icao]?.airmet}
                      pireps={weatherData[selectedStations[0]?.icao]?.pirep}
                    />
                  </div>
                  <div className="flex flex-col gap-6">
                    {weatherData[selectedStations[0]?.icao]?.taf && (
                      <div className="card p-4 animate-fade-in print:hidden">
                        <TafDisplay data={weatherData[selectedStations[0]?.icao]?.taf!} hideRaw={showTaf} />
                      </div>
                    )}
                    <GFADisplay icao={selectedStations[0]?.icao} />
                    <RadarDisplay icao={selectedStations[0]?.icao} />
                    <WeatherCameras icao={selectedStations[0]?.icao} />
                  </div>
                </div>
              </div>
            )
          } />
          <RouterRoute path="/weather-briefing" element={<WeatherBriefingPage />} />
          <RouterRoute path="/airport/:icao" element={<AirportDetailsPage />} />
        </Routes>
      </main>
      <SpeedInsights />
    </div>
  );
}

export default App;