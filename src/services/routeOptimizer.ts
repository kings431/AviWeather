import { Route, Airport, WeatherCondition } from '../types';
import { fetchStationData, fetchWeatherData } from './weatherApi';

interface OptimizationCriteria {
  minDistance?: boolean;
  avoidWeather?: boolean;
  preferAirways?: boolean;
  maxAltitude?: number;
}

export class RouteOptimizer {
  private static instance: RouteOptimizer;
  private airways: Map<string, any> = new Map();

  private constructor() {
    // Initialize airways data
    this.initializeAirways();
  }

  public static getInstance(): RouteOptimizer {
    if (!RouteOptimizer.instance) {
      RouteOptimizer.instance = new RouteOptimizer();
    }
    return RouteOptimizer.instance;
  }

  private async initializeAirways() {
    // TODO: Load airways data from a database or API
    // For now, we'll use a simple mock data
    this.airways.set('V300', {
      name: 'V300',
      waypoints: ['CYWG', 'YQT', 'CYQT'],
      minAltitude: 5000,
      maxAltitude: 18000
    });
  }

  public async optimizeRoute(
    departure: string,
    arrival: string,
    criteria: OptimizationCriteria = {}
  ): Promise<Route> {
    try {
      // Fetch airport data
      const [departureAirport, arrivalAirport] = await Promise.all([
        fetchStationData(departure),
        fetchStationData(arrival)
      ]);

      if (!departureAirport.latitude || !departureAirport.longitude || 
          !arrivalAirport.latitude || !arrivalAirport.longitude) {
        throw new Error('Invalid airport coordinates');
      }

      // Get weather data for both airports
      const [departureWeather, arrivalWeather] = await Promise.all([
        fetchWeatherData(departure),
        fetchWeatherData(arrival)
      ]);

      // For now, we'll use a simple direct route
      // In a real implementation, this would use A* or similar algorithm
      const waypoints = [departure, arrival];
      
      // Calculate distance using haversine formula
      const distance = this.calculateDistance(
        departureAirport.latitude,
        departureAirport.longitude,
        arrivalAirport.latitude,
        arrivalAirport.longitude
      );

      // Estimate flight time based on distance and typical cruise speed
      const estimatedTime = Math.round(distance / 120 * 60); // Assuming 120 knots ground speed

      // Analyze weather conditions
      const weatherConditions = this.analyzeWeatherConditions(
        departureWeather,
        arrivalWeather
      );

      return {
        waypoints,
        distance: Math.round(distance),
        estimatedTime,
        weatherConditions,
        alternates: []
      };
    } catch (error) {
      throw new Error('Failed to optimize route');
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private analyzeWeatherConditions(departureWeather: any, arrivalWeather: any): WeatherCondition[] {
    const conditions: WeatherCondition[] = [];

    // Analyze departure weather
    if (departureWeather.metar) {
      conditions.push({
        location: departureWeather.metar.station,
        type: 'METAR',
        severity: this.determineSeverity(departureWeather.metar),
        description: this.formatWeatherDescription(departureWeather.metar),
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      });
    }

    // Analyze arrival weather
    if (arrivalWeather.metar) {
      conditions.push({
        location: arrivalWeather.metar.station,
        type: 'METAR',
        severity: this.determineSeverity(arrivalWeather.metar),
        description: this.formatWeatherDescription(arrivalWeather.metar),
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      });
    }

    return conditions;
  }

  private determineSeverity(metar: any): 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' {
    // Simple severity determination based on visibility and ceiling
    const visibility = metar.visibility?.value || 10;
    const ceiling = metar.clouds?.find((c: any) => c.type === 'BKN' || c.type === 'OVC')?.height || 10000;

    if (visibility < 1 || ceiling < 500) return 'EXTREME';
    if (visibility < 3 || ceiling < 1000) return 'HIGH';
    if (visibility < 5 || ceiling < 3000) return 'MODERATE';
    return 'LOW';
  }

  private formatWeatherDescription(metar: any): string {
    const parts = [];
    
    if (metar.wind) {
      parts.push(`Wind: ${metar.wind.direction}° at ${metar.wind.speed}kt`);
    }
    
    if (metar.visibility) {
      parts.push(`Visibility: ${metar.visibility.value}${metar.visibility.unit}`);
    }
    
    if (metar.clouds) {
      const cloudDesc = metar.clouds.map((c: any) => 
        `${c.type} at ${c.height}00ft`
      ).join(', ');
      parts.push(`Clouds: ${cloudDesc}`);
    }

    return parts.join(', ');
  }
} 