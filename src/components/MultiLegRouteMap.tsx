import React, { useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { Waypoint, MultiLegRoute, RouteLeg } from '../types/route';
import { Plane, MapPin, Clock, Navigation } from 'lucide-react';

// Fix Leaflet's default icon path issues with bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom icons for different waypoint types
const departureIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const waypointIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MultiLegRouteMapProps {
  route: MultiLegRoute | null;
  isLoading?: boolean;
  onWaypointClick?: (waypoint: Waypoint, index: number) => void;
}

const MultiLegRouteMap: React.FC<MultiLegRouteMapProps> = ({ 
  route, 
  isLoading = false,
  onWaypointClick 
}) => {
  // Generate route lines for each leg
  const routeLines = useMemo(() => {
    if (!route?.legs) return [];
    
    return route.legs.map((leg, index) => {
      if (!leg.departure.lat || !leg.departure.lon || !leg.arrival.lat || !leg.arrival.lon) {
        return null;
      }
      
      return {
        positions: [
          [leg.departure.lat, leg.departure.lon],
          [leg.arrival.lat, leg.arrival.lon]
        ] as LatLngExpression[],
        leg,
        index
      };
    }).filter(Boolean);
  }, [route]);

  const handleWaypointClick = useCallback((waypoint: Waypoint, index: number) => {
    onWaypointClick?.(waypoint, index);
  }, [onWaypointClick]);

  const getWaypointIcon = (index: number) => {
    if (index === 0) return departureIcon;
    if (index === (route?.waypoints.length || 0) - 1) return destinationIcon;
    return waypointIcon;
  };

  const formatDistance = (distance: number) => {
    return `${distance.toFixed(1)} nm`;
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time);
    const minutes = Math.round((time - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBearing = (bearing: number) => {
    return `${Math.round(bearing)}°`;
  };

  if (isLoading) {
    return (
      <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading route...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <MapContainer
        center={[40, -100]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
        key={route?.waypoints.map(wp => wp.icao).join('-') || 'default'}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Route lines */}
        {routeLines.map((line, index) => (
          <Polyline
            key={`route-line-${index}`}
            positions={line!.positions}
            color="#3B82F6"
            weight={3}
            opacity={0.8}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold mb-2">
                  {line!.leg.departure.icao} → {line!.leg.arrival.icao}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    <span>{formatDistance(line!.leg.distance)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(line!.leg.estimatedTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4" />
                    <span>{formatBearing(line!.leg.bearing)}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Waypoint markers */}
        {route?.waypoints.map((waypoint, index) => {
          if (!waypoint.lat || !waypoint.lon) return null;
          
          return (
            <Marker
              key={`waypoint-${index}`}
              position={[waypoint.lat, waypoint.lon]}
              icon={getWaypointIcon(index)}
              eventHandlers={{
                click: () => handleWaypointClick(waypoint, index)
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold mb-1">{waypoint.icao}</div>
                  {waypoint.name && (
                    <div className="text-gray-600 mb-1">{waypoint.name}</div>
                  )}
                  {waypoint.city && (
                    <div className="text-gray-500">
                      {waypoint.city}{waypoint.state && `, ${waypoint.state}`}
                    </div>
                  )}
                  {waypoint.elevation && (
                    <div className="text-gray-500">
                      Elevation: {waypoint.elevation} ft
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MultiLegRouteMap; 