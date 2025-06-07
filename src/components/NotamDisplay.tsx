import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';

interface NotamDisplayProps {
  icao: string;
}

// Helper to parse NOTAM fields
function parseNotam(notam: any) {
  // Try to extract NOTAM number/title, validity, and body
  const raw = typeof notam === 'string' ? notam : notam.raw || notam.text || JSON.stringify(notam);
  // Example: (G1632/25 NOTAM ...) 2506061930 2506070200\nQ) ...
  const match = raw.match(/^(\([A-Z0-9\/ ]+\))\s+((?:\d{10}\s+)+)([\s\S]*)$/);
  if (match) {
    const title = match[1].trim();
    const validity = match[2].trim().split(/\s+/).filter(Boolean);
    const body = match[3].trim();
    return { title, validity, body };
  }
  // Fallback: just return the whole thing as body
  return { title: '', validity: [], body: raw };
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
          const { title, validity, body } = parseNotam(notam);
          return (
            <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {title && <span className="font-bold text-base font-mono text-white bg-gray-800 px-2 py-1 rounded">{title}</span>}
                {validity.map((v: string, i: number) => (
                  <span key={i} className="bg-green-600 text-white text-xs font-mono px-2 py-1 rounded ml-1">{v}</span>
                ))}
              </div>
              <pre className="font-mono text-xs whitespace-pre-wrap break-words bg-gray-100 dark:bg-gray-800 rounded p-2 mt-1">{body}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotamDisplay;