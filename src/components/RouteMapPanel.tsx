import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, LayersControl } from 'react-leaflet';
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

interface RouteMapPanelProps {
  waypoints: Waypoint[];
  routeData: RouteData | null;
  selectedMarker: string | null;
  onMarkerClick: (icao: string) => void;
  metarData?: Record<string, any>;
  tafData?: Record<string, any>;
}

const defaultPosition = [51, -100];

const RouteMapPanel: React.FC<RouteMapPanelProps> = ({
  waypoints,
  routeData,
  selectedMarker,
  onMarkerClick,
  metarData = {},
  tafData = {},
}) => {
  const positions = waypoints.filter(wp => wp.lat && wp.lon).map(wp => [wp.lat!, wp.lon!] as [number, number]);
  return (
    <MapContainer center={positions[0] || defaultPosition} zoom={5} style={{ height: 500, width: '100%' }} scrollWheelZoom={true}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        </LayersControl.BaseLayer>
        <LayersControl.Overlay checked name="Radar (OpenWeather)">
          <TileLayer url="https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=YOUR_OPENWEATHER_API_KEY" opacity={0.5} />
        </LayersControl.Overlay>
        <LayersControl.Overlay name="Clouds (OpenWeather)">
          <TileLayer url="https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=YOUR_OPENWEATHER_API_KEY" opacity={0.5} />
        </LayersControl.Overlay>
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
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
};

export default RouteMapPanel; 