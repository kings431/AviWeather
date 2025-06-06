import React from 'react';
import { Notam } from '../types';
import { useQuery } from 'react-query';
import axios from 'axios';

interface NotamDisplayProps {
  icao: string;
}

const NotamDisplay: React.FC<NotamDisplayProps> = ({ icao }) => {
  const { data: notams = [], isLoading, error } = useQuery(
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
    <div className="space-y-4">
      {notams.map((notam: Notam) => {
        // Extract the raw NOTAM text from the JSON string
        let raw = '';
        try {
          const parsed = JSON.parse((notam as any).text || '{}');
          raw = parsed.raw || notam.description || '';
        } catch {
          raw = notam.description || '';
        }
        // Split into lines
        const lines = raw.split(/\r?\n/);
        // First line: NOTAM number/type
        const headerLine = lines[0] || '';
        // Find the validity line (usually contains "B)" and "C)")
        const validityLine = lines.find(line => /B\)/.test(line) && /C\)/.test(line)) || '';
        // Extract validity codes (e.g., 2505312055 2506202300 EST.)
        const validityMatch = validityLine.match(/B\)\s*([A-Z0-9]+)\s*C\)\s*([A-Z0-9]+)([A-Z.]*)/);
        const validity =
          validityMatch
            ? `${validityMatch[1]} ${validityMatch[2]}${validityMatch[3] ? ' ' + validityMatch[3].trim() : ''}`
            : validityLine.replace(/^[^B]*B\)/, '').trim();

        // The rest of the NOTAM (skip header and validity lines)
        const bodyLines = lines.filter(
          line => line !== headerLine && line !== validityLine
        );
        const body = bodyLines.join('\n').replace(/^[ED]\)\s*/gm, '');

        return (
          <div
            key={notam.id}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow font-mono text-sm whitespace-pre-wrap"
            style={{ fontFamily: 'monospace' }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-bold text-base text-gray-900 dark:text-gray-100">{headerLine}</span>
              {validity && (
                <span className="bg-green-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
                  {validity}
                </span>
              )}
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs text-gray-900 dark:text-gray-100">{body}</pre>
          </div>
        );
      })}
    </div>
  );
};

export default NotamDisplay; 