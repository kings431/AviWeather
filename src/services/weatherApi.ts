import axios from 'axios';
import { MetarData, TafData, Station, WeatherData, TafPeriod } from '../types';

// API endpoints with CORS proxy
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const NOAA_BASE_URL = 'https://aviationweather.gov/cgi-bin/data';
const STATION_BASE_URL = 'https://api.aviationapi.com/v1/airports';

// Major airports database
const MAJOR_AIRPORTS: Record<string, Station> = {
  'KJFK': {
    icao: 'KJFK',
    iata: 'JFK',
    name: 'John F. Kennedy International Airport',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    elevation: 13,
    latitude: 40.6413,
    longitude: -73.7781,
  },
  'KLAX': {
    icao: 'KLAX',
    iata: 'LAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles',
    state: 'CA',
    country: 'USA',
    elevation: 125,
    latitude: 33.9416,
    longitude: -118.4085,
  },
  'EGLL': {
    icao: 'EGLL',
    iata: 'LHR',
    name: 'London Heathrow Airport',
    city: 'London',
    country: 'United Kingdom',
    elevation: 83,
    latitude: 51.4775,
    longitude: -0.4614,
  },
  'CYYZ': {
    icao: 'CYYZ',
    iata: 'YYZ',
    name: 'Toronto Pearson International Airport',
    city: 'Toronto',
    state: 'ON',
    country: 'Canada',
    elevation: 569,
    latitude: 43.6777,
    longitude: -79.6248,
  },
  'KSFO': {
    icao: 'KSFO',
    iata: 'SFO',
    name: 'San Francisco International Airport',
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
    elevation: 13,
    latitude: 37.6188,
    longitude: -122.3756,
  },
  'KORD': {
    icao: 'KORD',
    iata: 'ORD',
    name: 'Chicago O\'Hare International Airport',
    city: 'Chicago',
    state: 'IL',
    country: 'USA',
    elevation: 672,
    latitude: 41.9742,
    longitude: -87.9073,
  },
  'CYWG': {
    icao: 'CYWG',
    iata: 'YWG',
    name: 'Winnipeg James Armstrong Richardson International Airport',
    city: 'Winnipeg',
    state: 'MB',
    country: 'Canada',
    elevation: 783,
    latitude: 49.9100,
    longitude: -97.2398,
  },
  'CYVR': {
    icao: 'CYVR',
    iata: 'YVR',
    name: 'Vancouver International Airport',
    city: 'Vancouver',
    state: 'BC',
    country: 'Canada',
    elevation: 14,
    latitude: 49.1967,
    longitude: -123.1815,
  },
  'CYUL': {
    icao: 'CYUL',
    iata: 'YUL',
    name: 'Montreal-Trudeau International Airport',
    city: 'Montreal',
    state: 'QC',
    country: 'Canada',
    elevation: 118,
    latitude: 45.4706,
    longitude: -73.7408,
  },
  'CYOW': {
    icao: 'CYOW',
    iata: 'YOW',
    name: 'Ottawa Macdonald-Cartier International Airport',
    city: 'Ottawa',
    state: 'ON',
    country: 'Canada',
    elevation: 374,
    latitude: 45.3225,
    longitude: -75.6692,
  }
};

const OPENAIP_API_KEY = import.meta.env.VITE_OPENAIP_API_KEY;
console.log('VITE_OPENAIP_API_KEY:', OPENAIP_API_KEY);

// Helper function to get station data from aviationapi.com
const fetchStationFromAviationApi = async (icao: string): Promise<Station> => {
  try {
    const response = await axios.get(`${STATION_BASE_URL}?apt=${icao}`);
    const data = response.data[icao];
    
    if (!data) {
      throw new Error(`Station ${icao} not found`);
    }

    return {
      icao: data.facility_id,
      iata: data.facility_use === 'PU' ? data.facility_id.substring(1) : undefined,
      name: data.facility_name,
      city: data.city,
      state: data.state,
      country: data.country,
      elevation: data.elevation,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error(`Station ${icao} not found`);
    }
    throw new Error('Failed to fetch station data');
  }
};

// Helper function to parse METAR text into structured data
const parseMetar = (rawMetar: string, station: string): MetarData => {
  // Basic parsing of METAR components
  const parts = rawMetar.split(' ');
  const timeIndex = parts.findIndex(p => /^\d{6}Z$/.test(p));
  const windIndex = parts.findIndex(p => /^\d{5}(G\d{2})?KT$/.test(p));
  const tempIndex = parts.findIndex(p => /^M?\d{2}\/M?\d{2}$/.test(p));
  const altIndex = parts.findIndex(p => /^A\d{4}$/.test(p));

  // Extract wind data
  const windMatch = parts[windIndex]?.match(/^([0-9]{3}|VRB)([0-9]{2})(?:G([0-9]{2}))?KT$/);
  const wind = windMatch && windMatch[1] !== 'VRB' ? {
    direction: parseInt(windMatch[1]),
    speed: parseInt(windMatch[2]),
    gust: windMatch[3] ? parseInt(windMatch[3]) : undefined,
    unit: 'kt'
  } : windMatch && windMatch[1] === 'VRB' ? {
    direction: 0, // Use 0 for variable
    speed: parseInt(windMatch[2]),
    gust: windMatch[3] ? parseInt(windMatch[3]) : undefined,
    unit: 'kt'
  } : undefined;

  // Extract temperature and dewpoint
  const tempMatch = parts[tempIndex]?.match(/^(M?)(\d{2})\/(M?)(\d{2})$/);
  const temp = tempMatch ? {
    celsius: (tempMatch[1] ? -1 : 1) * parseInt(tempMatch[2]),
    fahrenheit: ((tempMatch[1] ? -1 : 1) * parseInt(tempMatch[2]) * 9/5) + 32
  } : { celsius: 0, fahrenheit: 32 };
  const dewpoint = tempMatch ? {
    celsius: (tempMatch[3] ? -1 : 1) * parseInt(tempMatch[4]),
    fahrenheit: ((tempMatch[3] ? -1 : 1) * parseInt(tempMatch[4]) * 9/5) + 32
  } : { celsius: 0, fahrenheit: 32 };

  // Extract altimeter
  const altMatch = parts[altIndex]?.match(/^A(\d{4})$/);
  const altimeter = altMatch ? {
    hpa: parseInt(altMatch[1]) / 10,
    inHg: parseInt(altMatch[1]) / 100
  } : { hpa: 1013.2, inHg: 29.92 };

  // Parse clouds and visibility
  const clouds: Array<{ type: 'FEW' | 'SCT' | 'BKN' | 'OVC'; height: number; modifier?: 'CB' | 'TCU' } > = [];
  let visibility = { value: 10, unit: 'sm' };
  let flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR' = 'VFR';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    // Parse visibility
    if (/^([0-9]+)SM$/.test(part)) {
      visibility = {
        value: parseInt(part),
        unit: 'sm'
      };
    }
    
    // Parse clouds
    if (/^(FEW|SCT|BKN|OVC)([0-9]{3})(CB|TCU)?$/.test(part)) {
      const match = part.match(/^(FEW|SCT|BKN|OVC)([0-9]{3})(CB|TCU)?$/);
      if (match) {
        clouds.push({
          type: match[1] as 'FEW' | 'SCT' | 'BKN' | 'OVC',
          height: parseInt(match[2]) * 100,
          modifier: match[3] as 'CB' | 'TCU' | undefined
        });
      }
    }
  }

  // Determine flight category based on visibility and clouds
  if (visibility.value < 1 || clouds.some(c => c.type === 'OVC' && c.height < 500)) {
    flightCategory = 'LIFR';
  } else if (visibility.value < 3 || clouds.some(c => c.type === 'OVC' && c.height < 1000)) {
    flightCategory = 'IFR';
  } else if (visibility.value < 5 || clouds.some(c => c.type === 'BKN' && c.height < 3000)) {
    flightCategory = 'MVFR';
  }

  return {
    raw: rawMetar,
    station,
    time: parts[timeIndex] || new Date().toISOString(),
    wind: wind,
    visibility,
    conditions: [], // NOAA doesn't provide parsed conditions
    clouds,
    temperature: temp,
    dewpoint,
    humidity: calculateHumidity(temp.celsius, dewpoint.celsius),
    barometer: altimeter,
    flight_category: flightCategory
  };
};

// Helper function to parse TAF text into structured data
const parseTaf = (rawTaf: string, icao: string): TafData => {
  try {
    // Clean up the raw TAF data
    const cleanedTaf = rawTaf
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^TAF\s+/, '') // Remove leading TAF
      .replace(/AMD\s+/, '') // Remove AMD (amended) if present
      .replace(/COR\s+/, ''); // Remove COR (corrected) if present

    // Split into header and forecast periods
    const [header, ...forecastParts] = cleanedTaf.split(/(?=FM\d{6}|TEMPO \d{4}\/\d{4}|BECMG \d{4}\/\d{4})/);
    if (!header) {
      throw new Error('Invalid TAF format: Missing header');
    }

    // Parse the header
    const headerMatch = header.match(/^(\w{4})\s+(\d{6}Z)\s+(\d{4}\/\d{4})?/);
    if (!headerMatch) {
      throw new Error('Invalid TAF format: Invalid header');
    }

    const [, station, issueTime, validTime] = headerMatch;
    if (station !== icao) {
      throw new Error(`Station mismatch: Expected ${icao}, got ${station}`);
    }

    // Parse forecast periods
    const periods: TafPeriod[] = [];
    for (const part of forecastParts) {
      const trimmed = part.trim();
      if (!trimmed || trimmed.startsWith('RMK')) continue;
      let periodType: 'FM' | 'BECMG' | 'TEMPO' = 'FM';
      let start = '', end = '';
      let match;
      if ((match = trimmed.match(/^FM(\d{6})/))) {
        periodType = 'FM';
        start = match[1];
      } else if ((match = trimmed.match(/^TEMPO (\d{4})\/(\d{4})/))) {
        periodType = 'TEMPO';
        start = match[1];
        end = match[2];
      } else if ((match = trimmed.match(/^BECMG (\d{4})\/(\d{4})/))) {
        periodType = 'BECMG';
        start = match[1];
        end = match[2];
      } else {
        // Unknown/unsupported period type, skip
        continue;
      }
      // Extract wind
      const windMatch = trimmed.match(/(\d{3}|VRB)(\d{2})(G\d{2})?(KT|MPS)/);
      const wind = windMatch ? {
        direction: windMatch[1] === 'VRB' ? 0 : parseInt(windMatch[1]),
        speed: parseInt(windMatch[2]),
        gust: windMatch[3] ? parseInt(windMatch[3].slice(1)) : undefined,
        unit: windMatch[4]
      } : undefined;
      // Extract visibility (precise: match only \b(P6SM|\d{1,2}SM)\b)
      const visMatch = trimmed.match(/\b(P6SM|\d{1,2}SM)\b/);
      const visibility = visMatch ? {
        value: visMatch[1] === 'P6SM' ? 6 : parseInt(visMatch[1]),
        unit: 'SM'
      } : undefined;
      // Extract clouds (e.g., BKN060 means 6,000 ft)
      const cloudMatches = Array.from(trimmed.matchAll(/(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?/g));
      const clouds = cloudMatches.map(match => ({
        type: match[1] as 'FEW' | 'SCT' | 'BKN' | 'OVC',
        height: parseInt(match[2]) * 100,
        modifier: match[3] as 'CB' | 'TCU' | undefined
      }));
      // Extract flight category (optional, not always present)
      const categoryMatch = trimmed.match(/(VFR|MVFR|IFR|LIFR)/);
      const flight_category = categoryMatch ? categoryMatch[1] as 'VFR' | 'MVFR' | 'IFR' | 'LIFR' : undefined;
      // Create period object
      const period: TafPeriod = {
        type: periodType,
        start,
        end,
        raw: trimmed,
        wind,
        visibility,
        conditions: [],
        clouds,
        flight_category
      };
      periods.push(period);
    }
    if (periods.length === 0) {
      console.warn('No valid forecast periods found in TAF');
    }
    return {
      raw: rawTaf,
      station: icao,
      issue_time: issueTime,
      valid_time: validTime || '',
      periods
    };
  } catch (error) {
    console.error('TAF parsing error:', error, 'Raw TAF:', rawTaf);
    // Return a minimal valid TAF object instead of throwing
    return {
      raw: rawTaf,
      station: icao,
      issue_time: new Date().toISOString().replace(/[-:]/g, '').slice(0, 10) + 'Z',
      valid_time: '',
      periods: []
    };
  }
};

// Helper functions
const calculateHumidity = (temp: number, dewpoint: number): number => {
  const a = 17.625;
  const b = 243.04;
  const tempC = temp + 273.15;
  const dewC = dewpoint + 273.15;
  return Math.round(100 * Math.exp((a * dewpoint) / (b + dewpoint)) / Math.exp((a * temp) / (b + temp)));
};

export const fetchStationData = async (icao: string): Promise<Station> => {
  try {
    const response = await fetch(`/api/openaip?icao=${icao}`);
    if (response.status === 401 || response.status === 403) {
      throw new Error('OpenAIP API key is missing, invalid, or unauthorized. Please check your API key and account status.');
    }
    if (!response.ok) throw new Error('Airport not found');
    const data = await response.json();
    const airport = data.items && data.items.length > 0 ? data.items[0] : null;
    if (!airport) throw new Error('Airport not found');
    // Map OpenAIP response to our Station type
    return {
      icao: airport.icao || icao,
      iata: airport.iata || undefined,
      name: airport.name || `${icao} Airport`,
      city: airport.location?.city || '',
      country: airport.location?.country || '',
      elevation: airport.elevation?.value,
      latitude: airport.geometry?.coordinates?.[1],
      longitude: airport.geometry?.coordinates?.[0],
    };
  } catch (error) {
    console.error('OpenAIP fetch error:', error);
    // Fallback to generic info if not found or error
    return {
      icao: icao,
      name: `${icao} Airport`,
      city: 'Unknown',
      country: 'Unknown',
    };
  }
};

export const fetchWeatherData = async (icao: string): Promise<WeatherData> => {
  try {
    // Fetch METARs from NavCanada
    const metarRes = await axios.get(`/api/metar?icao=${icao}&metar_choice=6`);
    const metars = metarRes.data.metars || [];
    const latestMetar = metarRes.data.latestMetar || null;

    // Fetch TAF from NOAA (unchanged)
    const tafUrl = `${NOAA_BASE_URL}/taf.php?ids=${icao}&format=raw`;
    const tafResponse = await axios.get(`${CORS_PROXY}${encodeURIComponent(tafUrl)}`).catch(error => {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { data: '' };
      }
      throw error;
    });
    const tafText = typeof tafResponse.data === 'string'
      ? tafResponse.data.trim()
      : tafResponse.data.contents?.trim() || '';

    // Only try to parse TAF if we have actual data
    const weatherData: WeatherData = {
      metar: latestMetar ? parseMetar(latestMetar.text, latestMetar.location) : undefined,
      taf: tafText && tafText !== 'No TAF available' ? parseTaf(tafText, icao) : undefined
    };
    console.log('Parsed METAR:', weatherData.metar);

    if (!weatherData.metar && !weatherData.taf) {
      throw new Error(`No weather data available for ${icao}`);
    }

    return weatherData;
  } catch (error) {
    console.error('Weather data fetch error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error(`Weather data not available for ${icao}`);
      }
      if (error.response?.status === 403) {
        throw new Error('Access to weather data is currently restricted. Please try again later.');
      }
    }
    throw new Error('Failed to fetch weather data. Please try again later.');
  }
};

export { parseMetar };