import React from 'react';

export type WeatherToggleType = 'METAR' | 'TAF' | 'NOTAM' | 'GFA' | 'RADAR' | 'WEATHERCAM' | 'SIGMET' | 'AIRMET' | 'PIREP';

interface RouteWeatherTogglesProps {
  selected: WeatherToggleType[];
  onChange: (selected: WeatherToggleType[]) => void;
}

const ALL_TOGGLES: WeatherToggleType[] = [
  'METAR', 'TAF', 'NOTAM', 'GFA', 'RADAR', 'WEATHERCAM', 'SIGMET', 'AIRMET', 'PIREP'
];

const RouteWeatherToggles: React.FC<RouteWeatherTogglesProps> = ({ selected, onChange }) => {
  const handleToggle = (type: WeatherToggleType) => {
    if (selected.includes(type)) {
      onChange(selected.filter(t => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };
  return (
    <div className="flex flex-wrap gap-3">
      {ALL_TOGGLES.map(type => (
        <label key={type} className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(type)}
            onChange={() => handleToggle(type)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <span>{type}</span>
        </label>
      ))}
    </div>
  );
};

export default RouteWeatherToggles; 