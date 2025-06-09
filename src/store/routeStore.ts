import { create } from 'zustand';
import { Route, Airport } from '../types';

interface RouteState {
  currentRoute: Route | null;
  alternateAirports: Airport[];
  isLoading: boolean;
  error: string | null;
  setCurrentRoute: (route: Route | null) => void;
  setAlternateAirports: (airports: Airport[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRouteStore = create<RouteState>((set) => ({
  currentRoute: null,
  alternateAirports: [],
  isLoading: false,
  error: null,
  setCurrentRoute: (route) => set({ currentRoute: route }),
  setAlternateAirports: (airports) => set({ alternateAirports: airports }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
})); 