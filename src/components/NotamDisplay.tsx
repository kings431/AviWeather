import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';

interface NotamDisplayProps {
  icao: string;
}

// Helper to parse NOTAM fields for aviation-style display
function parseNotamFields(notam: any) {
  const raw = typeof notam === 'string' ? notam : notam.raw || notam.text || JSON.stringify(notam);
  // Example: CYWG D0480/25 2502200901 PERMANENT\nBODY\n...
  // Try to extract ICAO, number, type, validity, status, and body
  // ICAO and number: e.g. CYWG D0480/25
  const headerMatch = raw.match(/([A-Z]{4})\s+([A-Z0-9]+\/[0-9]{2})/);
  const icao = headerMatch ? headerMatch[1] : '';
  const number = headerMatch ? headerMatch[2] : '';
  // Validity: 10 digit date(s)
  const validityMatch = raw.match(/(\d{10,})(?:\s+(\d{10,}))?/);
  const validity = validityMatch ? [validityMatch[1], validityMatch[2]].filter(Boolean) : [];
  // Status: PERMANENT, EST, etc.
  let status = '';
  if (/PERMANENT/i.test(raw)) status = 'PERMANENT';
  else if (/EST/i.test(raw)) status = 'EST';
  // Main body: after the validity and status
  let body = raw;
  if (validityMatch) {
    const idx = raw.indexOf(validityMatch[0]) + validityMatch[0].length;
    body = raw.slice(idx).replace(/PERMANENT|EST/i, '').trim();
  }
  // Remove ICAO/number from body if present
  if (headerMatch) {
    body = body.replace(headerMatch[0], '').trim();
  }
  return { icao, number, validity, status, body, raw };
}

const NotamDisplay: React.FC<NotamDisplayProps> = ({ icao }) => {
  const { data: notamResponse, isLoading, error } = useQuery(
    ['notams', icao],
    async () => {
      const response = await axios.get(`/api/notam?icao=${icao}`);
      return response.data;
    },
    {
      enabled: !!icao,
      refetchInterval: 60000,
    }
  );

  const notams = notamResponse?.data || [];

  if (isLoading) {
    return <div className="p-4">Loading NOTAMs...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 dark:text-red-400">
        Error: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  if (!notams.length) {
    return (
      <div className="p-4 text-gray-600 dark:text-gray-400">
        No NOTAMs found for {icao}
      </div>
    );
  }

  return (
    <div className="card mt-6">
      <h3 className="text-lg font-semibold mb-2">NOTAMs</h3>
      <div className="space-y-4">
        {notams.map((notam: any, idx: number) => {
          const { icao, number, validity, status, body, raw } = parseNotamFields(notam);
          return (
            <div key={idx} className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {icao && number && (
                  <span className="font-bold text-base font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {icao} {number}
                  </span>
                )}
                {validity.map((v: string, i: number) => (
                  <span key={i} className="bg-green-600 text-white text-xs font-mono px-2 py-1 rounded ml-1">{v}</span>
                ))}
                {status && (
                  <span className={`text-xs font-mono px-2 py-1 rounded ml-1 ${status === 'PERMANENT' ? 'bg-green-700 text-white' : 'bg-yellow-500 text-black'}`}>{status}</span>
                )}
              </div>
              <pre className="font-mono text-xs whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-800 rounded p-2 mt-1">{body || raw}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotamDisplay;