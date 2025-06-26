# Multi-Leg Route Planner

## Overview

The AviWeather Multi-Leg Route Planner is a comprehensive tool for planning complex flight routes with multiple waypoints. It provides interactive waypoint management, real-time weather data for each waypoint, and visual route display on an interactive map.

## Features

### 🛣️ Interactive Waypoint Management
- **Add/Remove Waypoints**: Dynamically add intermediate waypoints between departure and destination
- **Waypoint Validation**: Automatic ICAO code validation with airport autocomplete
- **Minimum Requirements**: Enforces minimum 2 waypoints (departure and destination)
- **Visual Indicators**: Color-coded waypoints (green for departure, blue for intermediate, red for destination)

### 🗺️ Interactive Map Display
- **Route Visualization**: Real-time route lines connecting all waypoints
- **Waypoint Markers**: Interactive markers with airport information popups
- **Route Information**: Click on route lines to see leg details (distance, time, bearing)
- **Map Layers**: Toggle between OpenStreetMap and satellite views
- **Auto-bounds**: Map automatically adjusts to show all waypoints

### 🌤️ Weather Integration
- **Batch Weather Fetching**: Simultaneously fetch METAR/TAF data for all waypoints
- **Smart Caching**: 5-minute cache for weather data to reduce API calls
- **Weather Display**: Click on waypoints to view detailed weather information
- **Refresh Capability**: Manual refresh button for updated weather data

### ⚡ Performance Optimizations
- **React Query Integration**: Efficient data fetching with automatic caching
- **SWR-like Caching**: Custom hooks for weather data caching
- **Parallel Processing**: Batch API calls for improved performance
- **Loading States**: Comprehensive loading indicators and error handling

## Usage

### Accessing the Multi-Leg Route Planner

1. Navigate to the AviWeather application
2. Click on "Multi-Leg Routes" in the header navigation
3. Or visit `/multi-leg-route-planner` directly

### Creating a Route

1. **Set Departure**: Enter the ICAO code for your departure airport
2. **Add Waypoints**: Click "Add Waypoint" to insert intermediate stops
3. **Set Destination**: Enter the ICAO code for your destination airport
4. **Configure Aircraft**: Select aircraft type and cruise speed
5. **View Results**: The route will automatically calculate and display

### Managing Waypoints

- **Add Waypoint**: Click the "Add Waypoint" button to insert a new waypoint
- **Remove Waypoint**: Click the minus icon next to any waypoint (except departure/destination)
- **Edit Waypoint**: Click on any waypoint field to modify the ICAO code
- **Auto-complete**: Type ICAO codes to get airport suggestions

### Viewing Weather Data

- **Click Waypoints**: Click on any waypoint marker on the map
- **Weather Panel**: Weather information appears in the right panel
- **METAR/TAF**: View both current conditions and forecasts
- **Refresh**: Use the "Refresh Weather" button for updated data

## Technical Architecture

### State Management

The multi-leg route planner uses Zustand for state management with the following key state:

```typescript
interface RoutePlanningState {
  waypoints: Waypoint[];
  isLoading: boolean;
  error: string | null;
  weatherCache: Record<string, CachedWeatherData>;
  selectedAircraft: string;
  cruiseSpeed: number;
  showAlternates: boolean;
}
```

### Data Flow

1. **Waypoint Input** → Store updates waypoints array
2. **Route Calculation** → React Query triggers route calculation
3. **Weather Fetching** → Batch API calls for all waypoints
4. **Cache Management** → Weather data cached for 5 minutes
5. **UI Updates** → Components re-render with new data

### Components Structure

```
MultiLegRoutePlanner/
├── WaypointManager.tsx      # Interactive waypoint management
├── MultiLegRouteMap.tsx     # Leaflet map with route display
├── MultiLegRoutePlanner.tsx # Main orchestrator component
└── useWeatherCache.ts       # Custom hooks for caching
```

### API Integration

- **Route Calculation**: `calculateMultiLegRoute()` function
- **Weather Fetching**: `fetchBatchWeatherData()` function
- **Airport Data**: Integration with existing airport APIs
- **Caching**: Custom caching layer with expiration

## Configuration

### Aircraft Presets

The system includes predefined aircraft configurations:

- Cessna 172 (120 knots)
- Piper PA-28 (115 knots)
- Beechcraft Bonanza (170 knots)
- Cirrus SR22 (180 knots)
- King Air 350 (310 knots)
- Pilatus PC-12 (270 knots)
- Custom (user-defined speed)

### Cache Settings

- **Weather Cache Duration**: 5 minutes
- **Route Cache Duration**: 10 minutes
- **Auto-refresh**: On window focus (if data is older than 2.5 minutes)
- **Network Reconnection**: Automatic refresh when connection is restored

## Error Handling

### Graceful Degradation

- **Invalid ICAO Codes**: Display error messages with suggestions
- **API Failures**: Fall back to cached data when available
- **Network Issues**: Retry mechanisms and offline indicators
- **Partial Failures**: Continue with available data

### User Feedback

- **Loading States**: Spinners and progress indicators
- **Error Messages**: Clear, actionable error descriptions
- **Success Confirmations**: Visual feedback for successful operations
- **Validation**: Real-time input validation with helpful messages

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Components load only when needed
2. **Memoization**: React.memo and useMemo for expensive calculations
3. **Debouncing**: Input changes debounced to reduce API calls
4. **Parallel Processing**: Batch API calls for multiple waypoints
5. **Caching**: Multiple layers of caching (React Query, custom hooks, localStorage)

### Bundle Size

- **Code Splitting**: Route planner loads separately from main app
- **Tree Shaking**: Unused components and functions removed
- **Dynamic Imports**: Heavy dependencies loaded on demand

## Future Enhancements

### Planned Features

- **Drag & Drop Reordering**: Visual waypoint reordering
- **Route Optimization**: Automatic route optimization algorithms
- **Alternate Airports**: Automatic alternate airport suggestions
- **Flight Planning**: Integration with flight planning services
- **Export Capabilities**: Export routes to various formats
- **Collaboration**: Share routes with other pilots

### Technical Improvements

- **Offline Support**: Full offline functionality with cached data
- **Real-time Updates**: WebSocket integration for live weather updates
- **Advanced Caching**: More sophisticated caching strategies
- **Performance Monitoring**: Analytics and performance tracking

## Troubleshooting

### Common Issues

1. **Waypoints Not Loading**: Check ICAO code validity and network connection
2. **Weather Data Missing**: Verify API endpoints and cache status
3. **Map Not Displaying**: Ensure Leaflet CSS is loaded correctly
4. **Route Calculation Errors**: Check waypoint coordinates and API responses

### Debug Information

- **Console Logs**: Detailed logging for development
- **Network Tab**: Monitor API calls and responses
- **React DevTools**: Inspect component state and props
- **Performance Profiling**: Identify bottlenecks and optimization opportunities

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Navigate to `/multi-leg-route-planner`

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Testing**: Unit tests for critical functions

### Testing

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows
- **Performance Tests**: Monitor bundle size and load times

---

For more information, see the main [README.md](README.md) file or contact the development team. 