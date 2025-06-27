import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Airport coordinates for demo
const airportCoords: Record<string, [number, number]> = {
  CYWG: [49.91, -97.24], // Winnipeg
  CYXL: [50.1139, -91.9053], // Sioux Lookout
  CYHD: [49.8317, -92.7442], // Dryden
  CYYZ: [43.6777, -79.6248], // Toronto
  CYVR: [49.1967, -123.1815], // Vancouver
  CYEG: [53.3097, -113.5792], // Edmonton
  CYYC: [51.1139, -114.0203], // Calgary
  CYOW: [45.3225, -75.6692], // Ottawa
  CYUL: [45.4706, -73.7408], // Montreal
  CYHZ: [44.8808, -63.5086], // Halifax
};

interface WeatherData {
  metar?: string;
  taf?: string;
  notams?: string[];
  alerts?: string[];
  timestamp: string;
}

interface AirportWeather {
  [icao: string]: WeatherData;
}

const WeatherBriefing: React.FC = () => {
  const printRef = useRef<HTMLDivElement>(null);
  
  // State for form fields
  const [flightInfo, setFlightInfo] = useState({
    airline: '',
    flightNumber: '',
    depart: '',
    arrive: '',
    alternate: '',
    departureTime: '',
  });
  const [aircraftInfo, setAircraftInfo] = useState({
    type: '',
    variant: '',
    climbProfile: '',
    cruiseProfile: '',
    descentProfile: '',
    callsign: '',
  });
  const [selections, setSelections] = useState({
    ofpLayout: '',
    airac: '',
    units: '',
    flightMaps: '',
    taxiOut: '',
    taxiIn: '',
    flightRules: '',
    typeOfFlight: '',
    alternatesCount: '',
  });
  const [optional, setOptional] = useState({
    schedBlock: '',
    departRwy: '',
    arriveRwy: '',
    altitude: '',
    passengers: '',
    freight: '',
    payload: '',
    zfw: '',
  });

  // Weather data state
  const [weatherData, setWeatherData] = useState<AirportWeather>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefingGenerated, setBriefingGenerated] = useState(false);
  const [showRadar, setShowRadar] = useState(false);

  // Helper function to get coordinates
  const getCoords = (icao: string): [number, number] | null => {
    return airportCoords[icao.toUpperCase()] || null;
  };

  // Build route positions for polyline
  const routePositions = [
    getCoords(flightInfo.depart),
    getCoords(flightInfo.arrive),
  ].filter(Boolean) as [number, number][];

  // Add alternate as a separate marker (not in polyline)
  const alternateCoords = getCoords(flightInfo.alternate);

  // Get center point for map
  const getMapCenter = () => {
    if (routePositions.length === 2) {
      return [
        (routePositions[0][0] + routePositions[1][0]) / 2,
        (routePositions[0][1] + routePositions[1][1]) / 2,
      ] as [number, number];
    }
    return [49.91, -97.24] as [number, number]; // Default to Winnipeg
  };

  // Get all airports in the route
  const getRouteAirports = () => {
    const airports = [flightInfo.depart, flightInfo.arrive];
    if (flightInfo.alternate) {
      airports.push(flightInfo.alternate);
    }
    return airports.filter(Boolean);
  };

  // Fetch weather data for airports
  const fetchWeatherData = async (icao: string): Promise<WeatherData> => {
    try {
      // Simulate API calls - replace with actual API endpoints
      const metarResponse = await fetch(`https://aviationweather.gov/cgi-bin/data/metar.php?ids=${icao}&format=raw&hours=2&taf=off&layout=off`);
      const tafResponse = await fetch(`https://aviationweather.gov/cgi-bin/data/taf.php?ids=${icao}&format=raw&hours=24&layout=off`);
      
      const metar = await metarResponse.text();
      const taf = await tafResponse.text();
      
      // Simulate NOTAMs and alerts
      const notams = [`NOTAM for ${icao}: Runway 13/31 closed for maintenance`];
      const alerts = [`Weather Alert for ${icao}: Low visibility conditions expected`];
      
      return {
        metar: metar || 'No METAR data available',
        taf: taf || 'No TAF data available',
        notams,
        alerts,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error fetching weather for ${icao}:`, error);
      return {
        metar: 'Error fetching METAR data',
        taf: 'Error fetching TAF data',
        notams: ['Error fetching NOTAMs'],
        alerts: ['Error fetching alerts'],
        timestamp: new Date().toISOString(),
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setBriefingGenerated(false);

    try {
      const airports = getRouteAirports();
      const weatherPromises = airports.map(async (icao) => {
        const data = await fetchWeatherData(icao);
        return { icao, data };
      });

      const results = await Promise.all(weatherPromises);
      const newWeatherData: AirportWeather = {};
      
      results.forEach(({ icao, data }) => {
        newWeatherData[icao] = data;
      });

      setWeatherData(newWeatherData);
      setBriefingGenerated(true);
    } catch (error) {
      setError('Failed to generate weather briefing. Please try again.');
      console.error('Error generating briefing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Print functionality
  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Weather Briefing - ${flightInfo.depart} to ${flightInfo.arrive}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 20px; }
                .airport { border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; }
                .weather-data { background: #f5f5f5; padding: 10px; margin: 5px 0; font-family: monospace; }
                .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // Download functionality
  const handleDownload = () => {
    const briefingData = {
      flightInfo,
      aircraftInfo,
      selections,
      optional,
      weatherData,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(briefingData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weather-briefing-${flightInfo.depart}-${flightInfo.arrive}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateFlightInfo = (field: string, value: string) => {
    setFlightInfo(prev => ({ ...prev, [field]: value }));
  };

  const updateAircraftInfo = (field: string, value: string) => {
    setAircraftInfo(prev => ({ ...prev, [field]: value }));
  };

  const updateSelections = (field: string, value: string) => {
    setSelections(prev => ({ ...prev, [field]: value }));
  };

  const updateOptional = (field: string, value: string) => {
    setOptional(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="pt-[110px] min-h-screen flex items-start justify-center bg-transparent">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
        {/* Left Column: Forms */}
        <div className="flex flex-col gap-6">
          {/* Flight Info Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Flight Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Airline <span className="text-gray-400">(ICAO)</span></label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="ZZZ"
                  value={flightInfo.airline}
                  onChange={(e) => updateFlightInfo('airline', e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Flight Number</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="0000"
                  value={flightInfo.flightNumber}
                  onChange={(e) => updateFlightInfo('flightNumber', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Depart</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="CYWG"
                  value={flightInfo.depart}
                  onChange={(e) => updateFlightInfo('depart', e.target.value.toUpperCase())}
                  maxLength={4}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Arrive</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="CYXL"
                  value={flightInfo.arrive}
                  onChange={(e) => updateFlightInfo('arrive', e.target.value.toUpperCase())}
                  maxLength={4}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Alternate</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="CYHD"
                  value={flightInfo.alternate}
                  onChange={(e) => updateFlightInfo('alternate', e.target.value.toUpperCase())}
                  maxLength={4}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Departure Time</label>
                <input 
                  type="datetime-local" 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800"
                  value={flightInfo.departureTime}
                  onChange={(e) => updateFlightInfo('departureTime', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Aircraft Info Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Aircraft Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Aircraft Type</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="SW4 - Metroliner"
                  value={aircraftInfo.type}
                  onChange={(e) => updateAircraftInfo('type', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Variant or Airframe</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="Default"
                  value={aircraftInfo.variant}
                  onChange={(e) => updateAircraftInfo('variant', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Climb Profile</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="BEST-RATE"
                  value={aircraftInfo.climbProfile}
                  onChange={(e) => updateAircraftInfo('climbProfile', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Cruise Profile</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="MCR"
                  value={aircraftInfo.cruiseProfile}
                  onChange={(e) => updateAircraftInfo('cruiseProfile', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Descent Profile</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="1000FPM"
                  value={aircraftInfo.descentProfile}
                  onChange={(e) => updateAircraftInfo('descentProfile', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">ATC Callsign</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="N133SB"
                  value={aircraftInfo.callsign}
                  onChange={(e) => updateAircraftInfo('callsign', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Selections Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Selections</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">OFP Layout</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="LIDO"
                  value={selections.ofpLayout}
                  onChange={(e) => updateSelections('ofpLayout', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">AIRAC Cycle</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="AIRAC 2403"
                  value={selections.airac}
                  onChange={(e) => updateSelections('airac', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Units</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="Kilograms"
                  value={selections.units}
                  onChange={(e) => updateSelections('units', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Flight Maps</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="Detailed"
                  value={selections.flightMaps}
                  onChange={(e) => updateSelections('flightMaps', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Taxi Out / In (Min)</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="20 / 8"
                  value={selections.taxiOut}
                  onChange={(e) => updateSelections('taxiOut', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Flight Rules</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="IFR"
                  value={selections.flightRules}
                  onChange={(e) => updateSelections('flightRules', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Type of Flight</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="Scheduled"
                  value={selections.typeOfFlight}
                  onChange={(e) => updateSelections('typeOfFlight', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Alternates Count</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="1"
                  value={selections.alternatesCount}
                  onChange={(e) => updateSelections('alternatesCount', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Optional Entries Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Optional Entries</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Sched Block Time</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="1:30"
                  value={optional.schedBlock}
                  onChange={(e) => updateOptional('schedBlock', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Depart Rwy</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="13"
                  value={optional.departRwy}
                  onChange={(e) => updateOptional('departRwy', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Arrive Rwy</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="16"
                  value={optional.arriveRwy}
                  onChange={(e) => updateOptional('arriveRwy', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Altitude (Feet)</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="AUTO"
                  value={optional.altitude}
                  onChange={(e) => updateOptional('altitude', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Passengers</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder="AUTO"
                  value={optional.passengers}
                  onChange={(e) => updateOptional('passengers', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Freight (KG)</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder=""
                  value={optional.freight}
                  onChange={(e) => updateOptional('freight', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Payload (KG)</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder=""
                  value={optional.payload}
                  onChange={(e) => updateOptional('payload', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Zero Fuel Weight (KG)</label>
                <input 
                  className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800" 
                  placeholder=""
                  value={optional.zfw}
                  onChange={(e) => updateOptional('zfw', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Generate Briefing Button */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <button
              onClick={handleSubmit}
              disabled={!flightInfo.depart || !flightInfo.arrive || !flightInfo.departureTime || isLoading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow transition"
            >
              {isLoading ? 'Generating Briefing...' : 'Generate Briefing'}
            </button>
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>
        </div>

        {/* Right Column: Map and Weather Summary */}
        <div className="flex flex-col gap-6">
          {/* Map */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 min-h-[600px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Route Map</h3>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showRadar}
                    onChange={(e) => setShowRadar(e.target.checked)}
                    className="rounded"
                  />
                  Weather Radar
                </label>
              </div>
            </div>
            {routePositions.length === 2 ? (
              <MapContainer
                center={getMapCenter()}
                zoom={6}
                scrollWheelZoom={true}
                style={{ height: 500, width: '100%' }}
                className="rounded-lg"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {showRadar && (
                  <TileLayer
                    url="https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi?service=WMS&request=GetMap&version=1.3.0&layers=nexrad-n0r&width=256&height=256&srs=EPSG:3857&bbox={bbox-epsg-3857}&format=image/png&transparent=true"
                    attribution="NOAA Weather Radar"
                    opacity={0.6}
                  />
                )}
                {/* Route polyline */}
                <Polyline positions={routePositions} color="#2563eb" weight={4} />
                {/* Departure marker */}
                <Marker position={routePositions[0]}>
                  <Popup>Departure: {flightInfo.depart}</Popup>
                </Marker>
                {/* Arrival marker */}
                <Marker position={routePositions[1]}>
                  <Popup>Arrival: {flightInfo.arrive}</Popup>
                </Marker>
                {/* Alternate marker, if present */}
                {alternateCoords && (
                  <Marker position={alternateCoords}>
                    <Popup>Alternate: {flightInfo.alternate}</Popup>
                  </Marker>
                )}
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-[500px] text-gray-400">
                Enter departure and arrival airports to see the route
              </div>
            )}
          </div>

          {/* Weather Summary */}
          {briefingGenerated && Object.keys(weatherData).length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6" ref={printRef}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Weather Summary</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow transition"
                  >
                    Print Briefing
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg shadow transition"
                  >
                    Download JSON
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {getRouteAirports().map((icao) => {
                  const data = weatherData[icao];
                  if (!data) return null;

                  return (
                    <div key={icao} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-blue-600 mb-2">{icao}</h4>
                      
                      {/* Weather Alerts */}
                      {data.alerts && data.alerts.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-red-600 mb-1">⚠️ Weather Alerts</h5>
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 rounded text-sm">
                            {data.alerts.map((alert, index) => (
                              <div key={index} className="text-red-700 dark:text-red-300">{alert}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* METAR */}
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">METAR</h5>
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-sm font-mono">
                          {data.metar}
                        </div>
                      </div>

                      {/* TAF */}
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TAF</h5>
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-sm font-mono">
                          {data.taf}
                        </div>
                      </div>

                      {/* NOTAMs */}
                      {data.notams && data.notams.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NOTAMs</h5>
                          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-sm">
                            {data.notams.map((notam, index) => (
                              <div key={index} className="mb-1">{notam}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherBriefing; 