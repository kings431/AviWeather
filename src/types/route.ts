import { WeatherData } from './index';

export interface Route {
  waypoints: string[];
  distance: number;
  estimatedTime: number;
  weatherConditions: WeatherCondition[];
  alternates: string[];
}

export interface WeatherCondition {
  location: string;
  type: 'METAR' | 'TAF' | 'SIGMET' | 'AIRMET';
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  description: string;
  validFrom: string;
  validTo: string;
}

// Legacy RouteData interface for backward compatibility
export interface RouteData {
  waypoints: Waypoint[];
  distance: number;
  ete: number;
}

// Enhanced waypoint interface for multi-leg flights
export interface Waypoint {
  icao: string;
  lat?: number;
  lon?: number;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  elevation?: number;
  isAlternate?: boolean;
  order?: number; // For maintaining waypoint order
}

// Multi-leg route data
export interface MultiLegRoute {
  waypoints: Waypoint[];
  legs: RouteLeg[];
  totalDistance: number;
  totalEstimatedTime: number;
  weatherData: Record<string, WeatherData>;
  alternates: Waypoint[];
  lastUpdated: number;
}

// Individual leg of a multi-leg route
export interface RouteLeg {
  departure: Waypoint;
  arrival: Waypoint;
  distance: number;
  estimatedTime: number;
  bearing: number;
  weatherConditions: WeatherCondition[];
}

// Cached weather data with expiration
export interface CachedWeatherData {
  data: WeatherData;
  timestamp: number;
  expiresAt: number;
}

// Route planning state
export interface RoutePlanningState {
  waypoints: Waypoint[];
  isLoading: boolean;
  error: string | null;
  weatherCache: Record<string, CachedWeatherData>;
  selectedAircraft: string;
  cruiseSpeed: number;
  showAlternates: boolean;
} 