import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import useStore from '../store';
import { fetchWeatherData } from '../services/weatherApi';

interface RefreshButtonProps {
  stationId: string;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({ stationId }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { setWeatherData, setError, clearError } = useStore();
  
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    clearError();
    
    try {
      const weatherData = await fetchWeatherData(stationId);
      setWeatherData(stationId, weatherData);
    } catch (error) {
      setError(`Failed to refresh weather data for ${stationId}`);
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`btn btn-ghost p-2 rounded-full ${isRefreshing ? 'text-primary-400' : 'text-primary-600 dark:text-primary-400'}`}
      aria-label="Refresh weather data"
      title="Refresh weather data"
    >
      <RefreshCw 
        size={18} 
        className={isRefreshing ? 'animate-spin' : ''} 
      />
    </button>
  );
};

export default RefreshButton;