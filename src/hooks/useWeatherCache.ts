import { useState, useEffect, useCallback } from 'react';
import { WeatherData } from '../types';
import { fetchWeatherData } from '../services/weatherApi';

interface CachedWeatherData {
  data: WeatherData;
  timestamp: number;
  expiresAt: number;
}

interface UseWeatherCacheOptions {
  cacheDuration?: number; // in milliseconds
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
}

const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useWeatherCache = (
  icao: string,
  options: UseWeatherCacheOptions = {}
) => {
  const {
    cacheDuration = DEFAULT_CACHE_DURATION,
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
  } = options;

  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Get cached data from localStorage
  const getCachedData = useCallback((): CachedWeatherData | null => {
    try {
      const cached = localStorage.getItem(`weather_${icao}`);
      if (!cached) return null;
      
      const parsed: CachedWeatherData = JSON.parse(cached);
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(`weather_${icao}`);
        return null;
      }
      
      return parsed;
    } catch {
      return null;
    }
  }, [icao]);

  // Set cached data in localStorage
  const setCachedData = useCallback((weatherData: WeatherData) => {
    try {
      const now = Date.now();
      const cachedData: CachedWeatherData = {
        data: weatherData,
        timestamp: now,
        expiresAt: now + cacheDuration,
      };
      localStorage.setItem(`weather_${icao}`, JSON.stringify(cachedData));
    } catch (error) {
      console.warn('Failed to cache weather data:', error);
    }
  }, [icao, cacheDuration]);

  // Fetch fresh data
  const fetchData = useCallback(async (force = false) => {
    if (!icao) return;

    const cached = getCachedData();
    
    // Return cached data if available and not forcing refresh
    if (cached && !force) {
      setData(cached.data);
      setError(null);
      return;
    }

    setIsLoading(true);
    setIsValidating(true);
    setError(null);

    try {
      const weatherData = await fetchWeatherData(icao);
      setData(weatherData);
      setCachedData(weatherData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather data';
      setError(errorMessage);
      
      // Fall back to cached data if available
      if (cached) {
        setData(cached.data);
      }
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [icao, getCachedData, setCachedData]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Revalidate on focus
  useEffect(() => {
    if (!revalidateOnFocus) return;

    const handleFocus = () => {
      const cached = getCachedData();
      if (cached && Date.now() > cached.timestamp + (cacheDuration / 2)) {
        // Revalidate if data is older than half the cache duration
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidateOnFocus, cacheDuration, getCachedData, fetchData]);

  // Revalidate on reconnect
  useEffect(() => {
    if (!revalidateOnReconnect) return;

    const handleOnline = () => {
      fetchData(true);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [revalidateOnReconnect, fetchData]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    refresh,
  };
};

// Hook for batch weather fetching
export const useBatchWeatherCache = (
  icaoCodes: string[],
  options: UseWeatherCacheOptions = {}
) => {
  const [data, setData] = useState<Record<string, WeatherData>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBatchData = useCallback(async () => {
    if (icaoCodes.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const results: Record<string, WeatherData> = {};
      
      // Fetch data for each ICAO code in parallel
      const promises = icaoCodes.map(async (icao) => {
        try {
          const weatherData = await fetchWeatherData(icao);
          return { icao, data: weatherData };
        } catch (err) {
          console.warn(`Failed to fetch weather for ${icao}:`, err);
          return { icao, data: { error: `Failed to fetch weather for ${icao}` } as WeatherData };
        }
      });

      const resultsArray = await Promise.allSettled(promises);
      
      resultsArray.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { icao, data } = result.value;
          results[icao] = data;
        }
      });

      setData(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch batch weather data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [icaoCodes]);

  useEffect(() => {
    fetchBatchData();
  }, [fetchBatchData]);

  const refresh = useCallback(() => {
    fetchBatchData();
  }, [fetchBatchData]);

  return {
    data,
    error,
    isLoading,
    refresh,
  };
}; 