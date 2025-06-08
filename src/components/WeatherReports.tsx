import React from 'react';
import { SigmetData, AirmetData, PirepData } from '../types';

interface WeatherReportsProps {
  sigmets?: SigmetData[];
  airmets?: AirmetData[];
  pireps?: PirepData[];
}

const WeatherReports: React.FC<WeatherReportsProps> = ({ sigmets, airmets, pireps }) => {
  // Only show the component if there are any reports
  if (!sigmets?.length && !airmets?.length && !pireps?.length) {
    return null;
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* SIGMETs */}
      {sigmets && sigmets.length > 0 && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-2">SIGMETs</h3>
          <div className="space-y-3">
            {sigmets.map((sigmet) => (
              <div key={sigmet.pk} className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-red-700 dark:text-red-300">SIGMET {sigmet.pk}</span>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    Valid: {formatTime(sigmet.startValidity)} - {formatTime(sigmet.endValidity)}
                  </div>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-sm text-red-800 dark:text-red-200">
                  {sigmet.text}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AIRMETs */}
      {airmets && airmets.length > 0 && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-2">AIRMETs</h3>
          <div className="space-y-3">
            {airmets.map((airmet) => (
              <div key={airmet.pk} className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-yellow-700 dark:text-yellow-300">AIRMET {airmet.pk}</span>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                    Valid: {formatTime(airmet.startValidity)} - {formatTime(airmet.endValidity)}
                  </div>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-sm text-yellow-800 dark:text-yellow-200">
                  {airmet.text}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PIREPs */}
      {pireps && pireps.length > 0 && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-2">PIREPs</h3>
          <div className="space-y-3">
            {pireps.map((pirep) => (
              <div key={pirep.pk} className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-blue-700 dark:text-blue-300">PIREP {pirep.pk}</span>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Reported: {formatTime(pirep.startValidity)}
                  </div>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-sm text-blue-800 dark:text-blue-200">
                  {pirep.text}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherReports; 