import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { WeatherToggleType } from './RouteWeatherToggles';

interface RouteMapProps {
  waypoints: { icao: string; lat: number; lon: number }[];
  alternates: { icao: string; lat: number; lon: number }[];
  weatherToggles: WeatherToggleType[];
}

const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const RouteMap: React.FC<RouteMapProps> = ({ waypoints, alternates, weatherToggles }) => {
  if (!waypoints.length) return null;
  const positions = waypoints.map(wp => [wp.lat, wp.lon] as [number, number]);
  const center = positions[0];
  return (
    <MapContainer center={center} zoom={6} scrollWheelZoom={true} style={{ height: 400, width: '100%' }}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
        </LayersControl.BaseLayer>
        {/* Weather overlays can be added here based on weatherToggles */}
        {weatherToggles.includes('RADAR') && (
          <LayersControl.Overlay checked name="RainViewer Radar">
            <TileLayer
              url="https://tilecache.rainviewer.com/v2/radar/{z}/{x}/{y}/256/6/1_1.png"
              attribution="Radar &copy; RainViewer"
              opacity={0.6}
            />
          </LayersControl.Overlay>
        )}
      </LayersControl>
      {/* Route polyline */}
      <Polyline positions={positions} color="blue" />
      {/* Waypoint markers */}
      {waypoints.map(wp => (
        <Marker key={wp.icao} position={[wp.lat, wp.lon]} icon={defaultIcon}>
        </Marker>
      ))}
      {/* Alternate airport markers */}
      {alternates.map(alt => (
        <Marker key={alt.icao} position={[alt.lat, alt.lon]} icon={greenIcon}>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default RouteMap; 