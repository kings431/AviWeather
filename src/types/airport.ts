export interface Airport {
  icao: string;
  iata?: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  type: 'airport' | 'heliport' | 'seaplane_base';
  runways: Runway[];
  services: AirportService[];
}

export interface Runway {
  ident: string;
  length: number;
  width: number;
  surface: string;
  lighted: boolean;
  closed: boolean;
}

export interface AirportService {
  type: 'fuel' | 'maintenance' | 'catering' | 'customs' | 'immigration';
  available: boolean;
  notes?: string;
} 