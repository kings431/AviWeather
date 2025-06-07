import React, { useState, useEffect } from 'react';
import { Notam } from '../types';

interface NotamDisplayProps {
  icao: string;
}

export default function NotamDisplay({ icao }: NotamDisplayProps) {
  const [notams, setNotams] = useState<Notam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchNotams = async () => {
      if (!icao) return;
      
      setLoading(true);
      setError(null);
      setNotams([]);
      
      try {
        const response = await fetch(`/api/notam?icao=${icao}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch NOTAMs: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (isMounted) {
          setNotams(data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch NOTAMs');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchNotams();

    return () => {
      isMounted = false;
    };
  }, [icao]);

  if (loading) {
    return <div className="p-4">Loading NOTAMs...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 dark:text-red-400">
        Error: {error}
      </div>
    );
  }

  if (notams.length === 0) {
    return (
      <div className="p-4 text-gray-600 dark:text-gray-400">
        No NOTAMs found for {icao}
      </div>
    );
  }

  return (
    <div className="card mt-6">
      <h3 className="text-lg font-semibold mb-2">NOTAMs</h3>
      <div className="space-y-6">
        {notams.map((notam) => {
          // Prefer 'english' field, else 'raw', else description
          let text = (notam as any).english || (notam as any).raw || notam.description || '';
          // Remove trailing JSON if present
          text = text.replace(/["']?\s*,?\s*["']?english["']?\s*:\s*null.*$/s, '');
          // Replace escaped newlines with real newlines
          text = text.replace(/\\n/g, '\n').replace(/\\r/g, '');
          text = text.replace(/\n/g, '\n').replace(/\r/g, '');
          // Remove any trailing unmatched braces or quotes
          text = text.replace(/[)}"']+$/, '');

          // Header: first line, rest is body
          const lines = text.split(/\r?\n/);
          const headerLine = lines[0] || '';
          const body = lines.slice(1).join('\n').trim();

          // Extract validity codes (B) and C) lines)
          const validityLine = lines.find((line: string) => /B\)/.test(line) && /C\)/.test(line)) || '';
          const validityMatch = validityLine.match(/B\)\s*([A-Z0-9]+)\s*C\)\s*([A-Z0-9]+)([A-Z.]*)/);
          const validity =
            validityMatch
              ? `${validityMatch[1]} ${validityMatch[2]}${validityMatch[3] ? ' ' + validityMatch[3].trim() : ''}`
              : validityLine.replace(/^[^B]*B\)/, '').trim();

          return (
            <div key={notam.id} className="pb-2">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-bold text-base text-gray-900 dark:text-gray-100">{headerLine}</span>
                {validity && (
                  <span className="bg-green-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
                    {validity}
                  </span>
                )}
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs text-gray-900 dark:text-gray-100 bg-transparent p-0 m-0 border-0 shadow-none">{body}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}