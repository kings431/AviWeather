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