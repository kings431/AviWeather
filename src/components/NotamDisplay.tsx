import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';

interface NotamDisplayProps {
  icao: string;
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
    <div className="card mt-6 print:contents">
      <h3 className="text-lg font-semibold mb-2 print:hidden">NOTAMs</h3>
      <div className="space-y-2 print:text-xs print:leading-tight print:space-y-1">
        {notams.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400">No NOTAMs found.</div>
        ) : (
          notams.map((notam: any, idx: number) => {
            return (
              <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded p-2 border border-gray-200 dark:border-gray-700 print:p-1 print:rounded-none print:border-none">
                <div className="font-mono whitespace-pre-wrap break-words print:text-xs print:leading-tight">
                  {notam.text}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotamDisplay;