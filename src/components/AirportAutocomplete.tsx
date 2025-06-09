import React, { useState, useRef } from 'react';
import { fetchStationData } from '../services/weatherApi';

interface AirportAutocompleteProps {
  onSelect: (icao: string) => void;
  placeholder?: string;
  exclude?: string[];
}

const AirportAutocomplete: React.FC<AirportAutocompleteProps> = ({ onSelect, placeholder = 'Enter ICAO code', exclude = [] }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setQuery(value);
    setError(null);
    setSuggestions([]);
    if (value.length === 4 && !exclude.includes(value)) {
      setLoading(true);
      try {
        const station = await fetchStationData(value);
        if (station && station.icao && !exclude.includes(station.icao)) {
          setSuggestions([station]);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        setSuggestions([]);
        setError('No airport found');
      } finally {
        setLoading(false);
        setIsDropdownOpen(true);
      }
    } else {
      setIsDropdownOpen(false);
    }
  };

  const handleSelect = (icao: string) => {
    setQuery('');
    setSuggestions([]);
    setIsDropdownOpen(false);
    onSelect(icao);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <input
        type="text"
        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onFocus={() => setIsDropdownOpen(!!suggestions.length)}
        maxLength={4}
      />
      {isDropdownOpen && suggestions.length > 0 && (
        <div className="absolute z-10 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow mt-1">
          {suggestions.map((s) => (
            <button
              key={s.icao}
              className="w-full text-left px-4 py-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
              onClick={() => handleSelect(s.icao)}
            >
              <span className="font-bold">{s.icao}</span> <span className="text-sm text-gray-500 ml-2">{s.name}</span>
            </button>
          ))}
        </div>
      )}
      {loading && <div className="absolute left-0 mt-1 text-xs text-gray-500">Loading...</div>}
      {error && <div className="absolute left-0 mt-1 text-xs text-red-500">{error}</div>}
    </div>
  );
};

export default AirportAutocomplete; 