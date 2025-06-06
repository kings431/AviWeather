import React, { useState } from 'react';

interface GFADisplayProps {
  icao: string;
}

// Mapping of Canadian ICAO prefixes to GFA regions
const CANADA_GFA_REGIONS: Record<string, { name: string; code: string }> = {
  C: { name: 'Prairies', code: 'PRA' }, // Default to Prairies for most C* codes
  CY: { name: 'Prairies', code: 'PRA' },
  CZ: { name: 'Prairies', code: 'PRA' },
  CW: { name: 'Western', code: 'WST' },
  CE: { name: 'Eastern', code: 'EST' },
  CU: { name: 'Northern', code: 'NWT' },
  // Add more as needed
};

const GFA_TYPES = [
  { label: 'Clouds', key: 'CLD' },
  { label: 'Weather', key: 'WX' },
  { label: 'Icing/Turb/Freezing', key: 'FZLVL' },
];

const getCanadaRegion = (icao: string) => {
  if (!icao) return CANADA_GFA_REGIONS['C'];
  const prefix2 = icao.slice(0, 2).toUpperCase();
  if (CANADA_GFA_REGIONS[prefix2]) return CANADA_GFA_REGIONS[prefix2];
  return CANADA_GFA_REGIONS['C'];
};

const getLatestGFATime = () => {
  // GFA images are issued every 6 hours: 00, 06, 12, 18 UTC
  const now = new Date();
  const utcHour = now.getUTCHours();
  const baseHour = [0, 6, 12, 18].reduce((prev, curr) => (utcHour >= curr ? curr : prev), 0);
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(baseHour).padStart(2, '0');
  return `${day} ${hour}00`;
};

const GFADisplay: React.FC<GFADisplayProps> = ({ icao }) => {
  const isCanada = icao && icao.toUpperCase().startsWith('C');
  const isUSA = icao && icao.toUpperCase().startsWith('K');
  const [gfaType, setGfaType] = useState(GFA_TYPES[0].key);
  const region = isCanada ? getCanadaRegion(icao) : null;
  const gfaTime = getLatestGFATime();

  // Example Nav Canada GFA image URL:
  // https://gfa-aws.navcanada.ca/images/gfa/CLD_CLDSFC_PRA_00.png
  const gfaImageUrl = isCanada
    ? `https://gfa.navcanada.ca/gfa/images/gfa/${gfaType}_CLDSFC_${region?.code}_00.png`
    : '';

  return (
    <div className="card mt-6">
      <h3 className="text-lg font-semibold mb-2">Graphical Area Forecasts (GFAs)</h3>
      {isCanada && (
        <div className="flex flex-col items-center">
          <a
            href="https://spaces.navcanada.ca/workspace/flightplanning/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-primary-600 text-white rounded shadow hover:bg-primary-700 transition mt-4"
          >
            View Canadian GFA Charts on Nav Canada Tool
          </a>
          <div className="text-xs text-gray-500 mt-2">
            Direct GFA images are not available for public use. Please use the official Nav Canada GFA tool.
          </div>
        </div>
      )}
      {isUSA && (
        <div className="flex flex-col items-center">
          <iframe
            src="https://aviationweather.gov/gfa/"
            title="FAA GFA Tool"
            width="100%"
            height="600"
            style={{ border: '1px solid #ccc', borderRadius: '8px' }}
          />
          <a
            href="https://aviationweather.gov/gfa/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-600 underline mt-1"
          >
            View on FAA GFA Tool
          </a>
        </div>
      )}
      {!isCanada && !isUSA && (
        <div className="text-sm text-gray-500">GFA data is only available for Canada and the USA.</div>
      )}
    </div>
  );
};

export default GFADisplay;