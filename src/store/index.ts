import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, AppActions, Station, WeatherData, ThemeMode } from '../types';
import type { Waypoint, RouteData } from '../components/RoutePlanner';

const MAX_RECENT_SEARCHES = 5;

interface StoreState extends AppState, AppActions {
  // Route Planner state
  routeWaypoints: Waypoint[];
  routeData: RouteData | null;
  metarData: Record<string, any>;
  tafData: Record<string, any>;
  setRouteWaypoints: (waypoints: Waypoint[] | ((wps: Waypoint[]) => Waypoint[])) => void;
  setRouteData: (data: RouteData | null | ((d: RouteData | null) => RouteData | null)) => void;
  setMetarData: (data: Record<string, any> | ((d: Record<string, any>) => Record<string, any>)) => void;
  setTafData: (data: Record<string, any> | ((d: Record<string, any>) => Record<string, any>)) => void;
}

const useStore = create<StoreState>()(
  persist(
    (set) => ({
      favorites: [],
      recentSearches: [],
      weatherData: {},
      selectedStations: [],
      themeMode: 'system',
      isLoading: false,
      error: null,
      // Route Planner state
      routeWaypoints: [
        { icao: '' }, // Departure
        { icao: '' }, // Arrival
      ],
      routeData: null,
      metarData: {},
      tafData: {},

      setWeatherData: (stationId, data) =>
        set((state) => ({
          weatherData: {
            ...state.weatherData,
            [stationId]: {
              ...data,
              lastUpdated: Date.now(),
            },
          },
        })),

      setSelectedStations: (stations) =>
        set(() => ({
          selectedStations: stations,
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

      setRouteWaypoints: (waypoints) =>
        set((state) => ({
          routeWaypoints: typeof waypoints === 'function' ? waypoints(state.routeWaypoints) : waypoints,
        })),
      setRouteData: (data) =>
        set((state) => ({
          routeData: typeof data === 'function' ? data(state.routeData) : data,
        })),
      setMetarData: (data) =>
        set((state) => ({
          metarData: typeof data === 'function' ? data(state.metarData) : data,
        })),
      setTafData: (data) =>
        set((state) => ({
          tafData: typeof data === 'function' ? data(state.tafData) : data,
        })),
    }),
    {
      name: 'avi-weather-storage',
      partialize: (state) => ({
        favorites: state.favorites,
        recentSearches: state.recentSearches,
        themeMode: state.themeMode,
        weatherData: state.weatherData,
        selectedStations: state.selectedStations,
        routeWaypoints: state.routeWaypoints,
        routeData: state.routeData,
        metarData: state.metarData,
        tafData: state.tafData,
      }),
    }
  )
);

export default useStore;