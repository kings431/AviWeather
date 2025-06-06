export type Station = {
  icao: string;
  name?: string;
  iata?: string;
  city?: string;
  state?: string;
  country?: string;
  elevation?: number;
  latitude?: number;
  longitude?: number;
  favorite?: boolean;
};

export type MetarData = {
  raw: string;
  station: string;
  time: string;
  wind?: {
    direction: number;
    speed: number;
    gust?: number;
    unit: string;
  };
  visibility: {
    value: number;
    unit: string;
  };
  conditions: Array<{
    code: string;
    description: string;
  }>;
  clouds: Array<{
    type: 'FEW' | 'SCT' | 'BKN' | 'OVC';
    height: number;
    modifier?: 'CB' | 'TCU';
  }>;
  temperature: {
    celsius: number;
    fahrenheit: number;
  };
  dewpoint: {
    celsius: number;
    fahrenheit: number;
  };
  humidity: number;
  barometer: {
    hpa: number;
    inHg: number;
  };
  flight_category: 'VFR' | 'MVFR' | 'IFR' | 'LIFR';
};

export interface TafPeriod {
  type: 'FM' | 'BECMG' | 'TEMPO';
  start: string;
  end: string;
  raw: string;
  wind?: {
    direction: number;
    speed: number;
    gust?: number;
    unit: string;
  };
  visibility?: {
    value: number;
    unit: string;
  };
  conditions: Array<{ code: string; description: string }>;
  clouds: Array<{
    type: 'FEW' | 'SCT' | 'BKN' | 'OVC';
    height: number;
    modifier?: 'CB' | 'TCU';
  }>;
  flight_category?: 'VFR' | 'MVFR' | 'IFR' | 'LIFR';
}

export interface TafData {
  raw: string;
  station: string;
  issue_time: string;
  valid_time: string;
  periods: TafPeriod[];
}

export type WeatherData = {
  metar?: MetarData;
  taf?: TafData;
  error?: string;
  lastUpdated?: number;
};

export type ThemeMode = 'light' | 'dark' | 'system';

export type AppState = {
  favorites: Station[];
  recentSearches: Station[];
  weatherData: Record<string, WeatherData>;
  selectedStation: Station | null;
  themeMode: ThemeMode;
  isLoading: boolean;
  error: string | null;
};

export type AppActions = {
  setWeatherData: (stationId: string, data: WeatherData) => void;
  setSelectedStation: (station: Station | null) => void;
  addToFavorites: (station: Station) => void;
  removeFromFavorites: (stationId: string) => void;
  addToRecentSearches: (station: Station) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
};

export interface Notam {
  id: string;
  title: string;
  description: string;
  validFrom: string;
  validTo: string;
}