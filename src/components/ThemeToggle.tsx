import React, { useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import useStore from '../store';
import { ThemeMode } from '../types';

const ThemeToggle: React.FC = () => {
  const { themeMode, setThemeMode } = useStore();
  
  useEffect(() => {
    const applyTheme = () => {
      if (themeMode === 'dark' || 
         (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    applyTheme();
    
    // Listen for OS theme changes when in system mode
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);
  
  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };
  
  return (
    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
      <button
        className={`p-2 rounded-full ${
          themeMode === 'light' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'
        }`}
        onClick={() => handleThemeChange('light')}
        aria-label="Light Mode"
      >
        <Sun size={18} />
      </button>
      
      <button
        className={`p-2 rounded-full ${
          themeMode === 'system' ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'
        }`}
        onClick={() => handleThemeChange('system')}
        aria-label="System Theme"
      >
        <Monitor size={18} />
      </button>
      
      <button
        className={`p-2 rounded-full ${
          themeMode === 'dark' ? 'bg-gray-700 text-primary-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'
        }`}
        onClick={() => handleThemeChange('dark')}
        aria-label="Dark Mode"
      >
        <Moon size={18} />
      </button>
    </div>
  );
};

export default ThemeToggle;