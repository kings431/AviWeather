import React, { useState } from 'react';
import { useQuery } from 'react-query';
import Header from './components/Header';
import FavoritesBar from './components/FavoritesBar';
import WeatherDisplay from './components/WeatherDisplay';
import GFADisplay from './components/GFADisplay';
import NotamDisplay from './components/NotamDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import useStore from './store';
import { fetchWeatherData, fetchStationData } from './services/weatherApi';
import RadarDisplay from './components/RadarDisplay';
import { Plane } from 'lucide-react';
import WeatherCameras from './components/WeatherCameras';
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
  const { 
    selectedStations, 
    weatherData, 
    setWeatherData,
    setSelectedStations,
    addToRecentSearches,
    error,
    clearError,
    setError
  } = useStore();

  // Remove old useQuery logic; fetching is now handled in SearchBar for all stations
  const isLoading = useStore(state => state.isLoading);

  // Quick Start logic
  const quickStartAirports = ['KJFK', 'KLAX', 'EGLL', 'KSFO', 'KORD', 'CYYZ', 'CYVR', 'CYUL', 'CYWG', 'CYOW'];
  const shuffledAirports = React.useMemo(() => {
    const arr = [...quickStartAirports];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 5);
  }, []);

  const handleQuickStart = async (icao: string) => {
    try {
      const stationData = await fetchStationData(icao);
      setSelectedStations([stationData]);
      addToRecentSearches(stationData);
    } catch (error) {
      setError(`Unable to find weather data for ${icao}`);
    }
  };

  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Header />
        
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Remove duplicate Print button here */}
          <div className="print:hidden">
            <FavoritesBar />
          </div>
          
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
          ) : selectedStations && selectedStations.length > 0 ? (
            <div className="space-y-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {selectedStations.map(station => (
                  <div key={station.icao} className="flex flex-col gap-4">
                    {weatherData[station.icao] && (
                      <WeatherDisplay 
                        weatherData={weatherData[station.icao]}
                        station={station}
                        lastUpdated={weatherData[station.icao].lastUpdated}
                      />
                    )}
                    <NotamDisplay icao={station.icao} />
                    <GFADisplay icao={station.icao} />
                    <RadarDisplay icao={station.icao} />
                    <WeatherCameras icao={station.icao} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="flex flex-col items-center">
                <div className="mb-4">
                  <Plane size={48} className="text-primary-500 mx-auto" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Welcome to AviWeather</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto text-lg mb-6">
                  Search for an airport using its ICAO code to get the latest aviation weather information including <b>METARs</b>, <b>TAFs</b>, and area forecasts.
                </p>
                <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg inline-block w-full max-w-md">
                  <p className="text-xl font-semibold mb-2">Quick Start</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">Try searching for these popular airports:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {shuffledAirports.map(icao => (
                      <button
                        key={icao}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded text-sm font-mono transition-colors shadow-sm"
                        onClick={() => handleQuickStart(icao)}
                      >
                        {icao}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        
        <footer className="bg-white dark:bg-gray-900 shadow-sm border-t border-gray-200 dark:border-gray-800 mt-auto">
          <div className="container mx-auto px-4 py-4">
            {/* Disclaimer Modal */}
            {showDisclaimer && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-lg w-full p-6 relative">
                  <button
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
                    onClick={() => setShowDisclaimer(false)}
                    aria-label="Close disclaimer"
                  >
                    &times;
                  </button>
                  <div className="font-semibold mb-2 text-lg">Legal Disclaimer</div>
                  <p className="mb-2 text-sm text-gray-800 dark:text-gray-100">
                    The information provided on this app is for general informational purposes only. AviWeather (or any associated person) is not responsible for any inaccuracy. Always get a proper flight briefing from your local FIC and/or fact check all information displayed with official sources!
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-100">
                    Please be aware that any information you may find here may be inaccurate or misleading. Use of information displayed is at your own risk.
                  </p>
                </div>
              </div>
            )}
            <div className="text-center text-xs text-gray-600 dark:text-gray-400 flex flex-col md:flex-row items-center justify-center gap-2">
              <span>All aviation data displayed belong to <a href="https://www.navcanada.ca/" target="_blank" rel="noopener noreferrer" className="underline">NAV CANADA</a></span>
              <span>-</span>
              <button className="underline cursor-pointer bg-transparent border-0 p-0 m-0 text-xs text-gray-600 dark:text-gray-400" style={{textDecoration: 'underline'}} onClick={() => setShowDisclaimer(true)}>
                Legal Disclaimer
              </button>
              <span className="ml-2">Version 1.0.0</span>
            </div>
          </div>
        </footer>
      </div>
      <SpeedInsights />
    </>
  );
}

export default App;