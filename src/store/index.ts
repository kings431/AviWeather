import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, AppActions, Station, WeatherData, ThemeMode } from '../types';

const MAX_RECENT_SEARCHES = 5;

const useStore = create<AppState & AppActions>()(
  persist(
    (set) => ({
      favorites: [],
      recentSearches: [],
      weatherData: {},
      selectedStation: null,
      themeMode: 'system',
      isLoading: false,
      error: null,

      setWeatherData: (stationId, data) =>
        set((state) => ({
          weatherData: {
            ...state.weatherData,
            [stationId]: data,
          },
        })),

      setSelectedStation: (station) => 
        set(() => ({
          selectedStation: station,
        })),

      addToFavorites: (station) =>
        set((state) => {
          const exists = state.favorites.some((s) => s.icao === station.icao);
          if (exists) return state;
          
          return {
            favorites: [...state.favorites, { ...station, favorite: true }],
          };
        }),

      removeFromFavorites: (stationId) =>
        set((state) => ({
          favorites: state.favorites.filter((station) => station.icao !== stationId),
        })),

      addToRecentSearches: (station) =>
        set((state) => {
          const filtered = state.recentSearches.filter(
            (s) => s.icao !== station.icao
          );
          
          return {
            recentSearches: [
              station,
              ...filtered,
            ].slice(0, MAX_RECENT_SEARCHES),
          };
        }),

      setThemeMode: (mode) =>
        set(() => ({
          themeMode: mode,
        })),

      setIsLoading: (isLoading) =>
        set(() => ({
          isLoading,
        })),

      setError: (error) =>
        set(() => ({
          error,
        })),

      clearError: () =>
        set(() => ({
          error: null,
        })),
    }),
    {
      name: 'avi-weather-storage',
      partialize: (state) => ({
        favorites: state.favorites,
        recentSearches: state.recentSearches,
        themeMode: state.themeMode,
      }),
    }
  )
);

export default useStore;