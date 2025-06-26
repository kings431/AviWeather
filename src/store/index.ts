import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, AppActions, Station, WeatherData, ThemeMode } from '../types';
import type { Waypoint, RouteData, MultiLegRoute, RoutePlanningState, CachedWeatherData } from '../types/route';

const MAX_RECENT_SEARCHES = 5;
const WEATHER_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface StoreState extends AppState, AppActions {
  // Route Planner state
  routeWaypoints: Waypoint[];
  routeData: RouteData | null;
  metarData: Record<string, any>;
  tafData: Record<string, any>;
  
  // Multi-leg route planning state
  multiLegRoute: MultiLegRoute | null;
  routePlanningState: RoutePlanningState;
  
  // Actions
  setRouteWaypoints: (waypoints: Waypoint[] | ((wps: Waypoint[]) => Waypoint[])) => void;
  setRouteData: (data: RouteData | null | ((d: RouteData | null) => RouteData | null)) => void;
  setMetarData: (data: Record<string, any> | ((d: Record<string, any>) => Record<string, any>)) => void;
  setTafData: (data: Record<string, any> | ((d: Record<string, any>) => Record<string, any>)) => void;
  
  // Multi-leg route actions
  setMultiLegRoute: (route: MultiLegRoute | null) => void;
  addWaypoint: (waypoint: Waypoint, index?: number) => void;
  removeWaypoint: (index: number) => void;
  updateWaypoint: (index: number, waypoint: Partial<Waypoint>) => void;
  reorderWaypoints: (fromIndex: number, toIndex: number) => void;
  setRoutePlanningState: (state: Partial<RoutePlanningState>) => void;
  updateWeatherCache: (icao: string, weatherData: WeatherData) => void;
  clearWeatherCache: () => void;
  getCachedWeather: (icao: string) => WeatherData | null;
}

const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recentSearches: [],
      weatherData: {},
      selectedStations: [],
      themeMode: 'system',
      isLoading: false,
      error: null,
      
      // Route Planner state (legacy)
      routeWaypoints: [
        { icao: '' }, // Departure
        { icao: '' }, // Arrival
      ],
      routeData: null,
      metarData: {},
      tafData: {},

      // Multi-leg route planning state
      multiLegRoute: null,
      routePlanningState: {
        waypoints: [
          { icao: '', order: 0 }, // Departure
          { icao: '', order: 1 }, // Arrival
        ],
        isLoading: false,
        error: null,
        weatherCache: {},
        selectedAircraft: 'Cessna 172',
        cruiseSpeed: 120,
        showAlternates: false,
      },

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

      // Legacy route actions
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

      // Multi-leg route actions
      setMultiLegRoute: (route) =>
        set(() => ({
          multiLegRoute: route,
        })),

      addWaypoint: (waypoint, index) =>
        set((state) => {
          const waypoints = [...state.routePlanningState.waypoints];
          const insertIndex = index !== undefined ? index : waypoints.length - 1;
          
          // Update order for all waypoints
          waypoints.splice(insertIndex, 0, { ...waypoint, order: insertIndex });
          waypoints.forEach((wp, i) => {
            if (i >= insertIndex) wp.order = i;
          });
          
          return {
            routePlanningState: {
              ...state.routePlanningState,
              waypoints,
            },
          };
        }),

      removeWaypoint: (index) =>
        set((state) => {
          const waypoints = state.routePlanningState.waypoints.filter((_, i) => i !== index);
          
          // Update order for remaining waypoints
          waypoints.forEach((wp, i) => {
            wp.order = i;
          });
          
          return {
            routePlanningState: {
              ...state.routePlanningState,
              waypoints,
            },
          };
        }),

      updateWaypoint: (index, waypoint) =>
        set((state) => {
          const waypoints = [...state.routePlanningState.waypoints];
          waypoints[index] = { ...waypoints[index], ...waypoint };
          
          return {
            routePlanningState: {
              ...state.routePlanningState,
              waypoints,
            },
          };
        }),

      reorderWaypoints: (fromIndex, toIndex) =>
        set((state) => {
          const waypoints = [...state.routePlanningState.waypoints];
          const [removed] = waypoints.splice(fromIndex, 1);
          waypoints.splice(toIndex, 0, removed);
          
          // Update order for all waypoints
          waypoints.forEach((wp, i) => {
            wp.order = i;
          });
          
          return {
            routePlanningState: {
              ...state.routePlanningState,
              waypoints,
            },
          };
        }),

      setRoutePlanningState: (newState) =>
        set((state) => ({
          routePlanningState: {
            ...state.routePlanningState,
            ...newState,
          },
        })),

      updateWeatherCache: (icao, weatherData) =>
        set((state) => {
          const now = Date.now();
          const cache = {
            ...state.routePlanningState.weatherCache,
            [icao]: {
              data: weatherData,
              timestamp: now,
              expiresAt: now + WEATHER_CACHE_DURATION,
            },
          };
          
          return {
            routePlanningState: {
              ...state.routePlanningState,
              weatherCache: cache,
            },
          };
        }),

      clearWeatherCache: () =>
        set((state) => ({
          routePlanningState: {
            ...state.routePlanningState,
            weatherCache: {},
          },
        })),

      getCachedWeather: (icao) => {
        const state = get();
        const cached = state.routePlanningState.weatherCache[icao];
        
        if (!cached) return null;
        
        const now = Date.now();
        if (now > cached.expiresAt) {
          // Cache expired, remove it
          const { [icao]: removed, ...remainingCache } = state.routePlanningState.weatherCache;
          set((state) => ({
            routePlanningState: {
              ...state.routePlanningState,
              weatherCache: remainingCache,
            },
          }));
          return null;
        }
        
        return cached.data;
      },
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
        multiLegRoute: state.multiLegRoute,
        routePlanningState: state.routePlanningState,
      }),
    }
  )
);

export default useStore;