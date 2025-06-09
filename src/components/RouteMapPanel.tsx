import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, LayersControl, ImageOverlay, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Waypoint {
  icao: string;
  lat?: number;
  lon?: number;
}

interface RouteData {
  waypoints: Waypoint[];
  distance: number;
  ete: number;
}

interface Pirep {
  lat: number;
  lon: number;
  text: string;
}

interface SigmetAirmet {
  coords: [number, number][];
  text: string;
}

interface WeatherCam {
  image: string;
  url: string;
}

interface RouteMapPanelProps {
  waypoints: Waypoint[];
  routeData: RouteData | null;
  selectedMarker: string | null;
  onMarkerClick: (icao: string) => void;
  metarData?: Record<string, any>;
  tafData?: Record<string, any>;
  sigmetData?: SigmetAirmet[];
  airmetData?: SigmetAirmet[];
  pirepData?: Pirep[];
  weatherCams?: Record<string, WeatherCam>;
  gfaLinks?: string[];
}

const OPENWEATHER_API_KEY = 'c4946a82d8310d8fba50607b5bc66d82';
const defaultPosition = [51, -100];

const RouteMapPanel: React.FC<RouteMapPanelProps> = ({
  waypoints,
  routeData,
  selectedMarker,
  onMarkerClick,
  metarData = {},
  tafData = {},
  sigmetData = [],
  airmetData = [],
  pirepData = [],
  weatherCams = {},
  gfaLinks = [],
}) => {
  const positions = waypoints.filter(wp => wp.lat && wp.lon).map(wp => [wp.lat!, wp.lon!] as [number, number]);
  return (
    <MapContainer center={positions[0] || defaultPosition} zoom={5} style={{ height: 500, width: '100%' }} scrollWheelZoom={true}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        </LayersControl.BaseLayer>
        <LayersControl.Overlay checked name="Radar (OpenWeather)">
          <TileLayer url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`} opacity={0.5} />
        </LayersControl.Overlay>
        <LayersControl.Overlay name="Clouds (OpenWeather)">
          <TileLayer url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`} opacity={0.5} />
        </LayersControl.Overlay>
        {/* GFA overlays as images (if available) */}
        {gfaLinks.map((link, idx) => (
          <LayersControl.Overlay key={link} name={`GFA Chart ${idx + 1}`} checked={false}>
            <ImageOverlay url={link} bounds={[[40, -130], [60, -90]]} opacity={0.4} />
          </LayersControl.Overlay>
        ))}
      </LayersControl>
      {positions.length > 1 && <Polyline positions={positions} color="blue" />}
      {waypoints.map((wp, idx) =>
        wp.lat && wp.lon ? (
          <Marker key={wp.icao + idx} position={[wp.lat, wp.lon]} eventHandlers={{ click: () => onMarkerClick(wp.icao) }}>
            <Popup>
              <div>
                <strong>{wp.icao}</strong>
                <div>METAR: {metarData[wp.icao]?.raw || 'Loading...'}</div>
                <div>TAF: {tafData[wp.icao]?.raw || 'Loading...'}</div>
                {weatherCams[wp.icao] && (
                  <div className="mt-2">
                    <img src={weatherCams[wp.icao].image} alt="Weather Cam" className="w-32 h-20 object-cover" />
                    <a href={weatherCams[wp.icao].url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline block mt-1">View Camera</a>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
      {/* PIREP markers */}
      {pirepData.map((p, idx) => (
        <Marker key={`pirep-${idx}`} position={[p.lat, p.lon]}>
          <Popup>
            <div>
              <strong>PIREPs</strong>
              <div>{p.text}</div>
            </div>
          </Popup>
        </Marker>
      ))}
      {/* SIGMET/AIRMET polygons */}
      {sigmetData.map((s, idx) => (
        <Polygon key={`sigmet-${idx}`} positions={s.coords} pathOptions={{ color: 'red', fillOpacity: 0.2 }}>
          <Popup>
            <div>
              <strong>SIGMET</strong>
              <div>{s.text}</div>
            </div>
          </Popup>
        </Polygon>
      ))}
      {airmetData.map((a, idx) => (
        <Polygon key={`airmet-${idx}`} positions={a.coords} pathOptions={{ color: 'orange', fillOpacity: 0.2 }}>
          <Popup>
            <div>
              <strong>AIRMET</strong>
              <div>{a.text}</div>
            </div>
          </Popup>
        </Polygon>
      ))}
    </MapContainer>
  );
};

export default RouteMapPanel; 