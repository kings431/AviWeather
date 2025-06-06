import React, { useEffect } from 'react';
import Header from './components/Header';
import FavoritesBar from './components/FavoritesBar';
import WeatherDisplay from './components/WeatherDisplay';
import GFADisplay from './components/GFADisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import useStore from './store';

function App() {
  const { 
    selectedStation, 
    weatherData, 
    isLoading, 
    error,
    clearError
  } = useStore();

  useEffect(() => {
    // If there's an error, automatically clear it after 5 seconds
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <FavoritesBar />
        
        {error && (
          <div className="mb-6">
            <ErrorMessage 
              message={error} 
              onDismiss={clearError} 
            />
          </div>
        )}
        
        {isLoading ? (
          <LoadingSpinner />
        ) : selectedStation ? (
          <div className="space-y-8 mb-8">
            {weatherData[selectedStation.icao] && (
              <WeatherDisplay 
                weatherData={weatherData[selectedStation.icao]}
                station={selectedStation}
              />
            )}
            
            <GFADisplay icao={selectedStation.icao} />
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">Welcome to AviWeather</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
              Search for an airport using its ICAO code to get the latest aviation weather information including METARs, TAFs, and area forecasts.
            </p>
            <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm inline-block">
              <p className="text-lg font-medium mb-2">Quick Start</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">Try searching for these popular airports:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['KJFK', 'KLAX', 'EGLL', 'KSFO', 'KORD'].map(icao => (
                  <div key={icao} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                    {icao}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer className="bg-white dark:bg-gray-900 shadow-sm border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>© {new Date().getFullYear()} AviWeather. For informational purposes only. Not for operational use.</p>
            <p className="text-xs mt-1">Always verify weather information with official sources before flight.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;