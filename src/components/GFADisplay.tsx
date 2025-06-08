import React, { useState } from 'react';
import GfaImage from './GfaImage';

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
  { label: 'Clouds & Weather', key: 'CLDWX' },
  { label: 'Icing, Turbulence & Freezing Level', key: '&image=GFA/TURBC' },
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
    <div className="card mt-6 print:contents">
      <h3 className="text-lg font-semibold mb-2 print:hidden">Graphical Area Forecasts (GFAs)</h3>
      {isCanada && (
        <div className="flex flex-col items-center print:contents">
          <div className="flex gap-2 mb-2 print:hidden">
            {GFA_TYPES.map(type => (
              <button
                key={type.key}
                className={`px-3 py-1 rounded ${gfaType === type.key ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
                onClick={() => setGfaType(type.key as any)}
              >
                {type.label} - {region?.name}
              </button>
            ))}
          </div>
          <GfaImage station={icao} type={gfaType as any} />
        </div>
      )}
      {isUSA && (
        <div className="flex flex-col items-center print:hidden">
          <iframe
            src="https://aviationweather.gov/gfa/"
            title="FAA GFA Tool"
            width="100%"
            style={{ border: '1px solid #ccc', borderRadius: '8px', width: '100%', height: 'auto', minHeight: 0 }}
            className="w-full h-auto"
            allowFullScreen
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
        <div className="text-sm text-gray-500 print:hidden">GFA data is only available for Canada and the USA.</div>
      )}
    </div>
  );
};

export default GFADisplay;