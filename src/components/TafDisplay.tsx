import React from 'react';
import { TafData, TafPeriod } from '../types';
import { Calendar, Clock } from 'lucide-react';

interface TafDisplayProps {
  data: TafData;
  hideSimplified?: boolean;
  hideTitle?: boolean;
}

const FlightCategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  let bgColor = 'bg-success-100 text-success-800';
  let label = 'VFR';
  
  switch (category) {
    case 'VFR':
      bgColor = 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200';
      label = 'VFR';
      break;
    case 'MVFR':
      bgColor = 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200';
      label = 'MVFR';
      break;
    case 'IFR':
      bgColor = 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200';
      label = 'IFR';
      break;
    case 'LIFR':
      bgColor = 'bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-200';
      label = 'LIFR';
      break;
  }
  
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${bgColor}`}>
      {label}
    </span>
  );
};

const formatDateFromZulu = (dateStr: string): string => dateStr || '';

const formatTimeFromZulu = (zuluDate: string): string => {
  try {
    // Format: YYYYMMDDHHMM -> HH:MM
    const hour = zuluDate.slice(8, 10);
    const minute = zuluDate.slice(10, 12);
    return `${hour}:${minute}Z`;
  } catch (e) {
    return zuluDate;
  }
};

// Helper to parse TAF period time (e.g., 061500 or 0603) to readable string
function parseTafPeriodTime(periodTime: string, tafIssueTime?: string): string {
  if (!periodTime || periodTime.length < 4) return '';
  // Try to get year/month from TAF issue time (e.g., 060240Z)
  let year = new Date().getUTCFullYear();
  let month = new Date().getUTCMonth();
  if (tafIssueTime && /^\d{6}Z$/.test(tafIssueTime)) {
    // e.g., 060240Z: day=06, hour=02, min=40
    const day = parseInt(tafIssueTime.slice(0, 2));
    const issueMonth = new Date().getUTCMonth();
    const issueYear = new Date().getUTCFullYear();
    year = issueYear;
    month = issueMonth;
  }
  let day, hour, min;
  if (periodTime.length === 6) {
    // e.g., 061500: day=06, hour=15, min=00
    day = parseInt(periodTime.slice(0, 2));
    hour = parseInt(periodTime.slice(2, 4));
    min = parseInt(periodTime.slice(4, 6));
  } else if (periodTime.length === 4) {
    // e.g., 0603: day=06, hour=03
    day = parseInt(periodTime.slice(0, 2));
    hour = parseInt(periodTime.slice(2, 4));
    min = 0;
  } else {
    return periodTime;
  }
  // Construct UTC date
  const date = new Date(Date.UTC(year, month, day, hour, min));
  if (isNaN(date.getTime())) return periodTime;
  return date.toUTCString().replace(/:00 GMT$/, 'Z');
}

const ForecastPeriod: React.FC<{ period: TafPeriod; index: number; tafIssueTime?: string }> = ({ period, index, tafIssueTime }) => {
  // Format the time periods
  const fromTime = parseTafPeriodTime(period.start, tafIssueTime);
  const toTime = parseTafPeriodTime(period.end, tafIssueTime);
  
  // Helper function to format wind direction
  const formatWindDirection = (direction: number | string | undefined) => {
    if (direction === undefined) return 'N/A';
    if (typeof direction === 'string') {
      return direction === 'VRB' ? 'Variable' : direction;
    }
    return `${direction}°`;
  };
  
  return (
    <div className={`p-4 rounded-lg border ${
      period.type === 'TEMPO' 
        ? 'border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-900/30' 
        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-0.5 rounded ${
              period.type === 'FM' 
                ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                : period.type === 'BECMG' 
                  ? 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200'
                  : 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200'
            }`}>
              {period.type}
            </span>
            <span className="text-sm font-medium">
              {fromTime} - {toTime}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Period {index + 1}</p>
        </div>
        <FlightCategoryBadge category={period.flight_category || 'VFR'} />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
        {/* Wind */}
        <div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Wind:</span>
          <p className="text-gray-800 dark:text-gray-200">
            {period.wind ? (
              <>
                {formatWindDirection(period.wind.direction)} at {period.wind.speed} {period.wind.unit}
                {period.wind.gust && ` (gusting to ${period.wind.gust} ${period.wind.unit})`}
              </>
            ) : 'N/A'}
          </p>
        </div>
        
        {/* Visibility */}
        <div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Visibility:</span>
          <p className="text-gray-800 dark:text-gray-200">
            {period.visibility ? `${period.visibility.value} ${period.visibility.unit}` : 'N/A'}
          </p>
        </div>
      </div>
      
      {/* Cloud Layers */}
      {period.clouds && period.clouds.length > 0 && (
        <div className="mt-3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Clouds:</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {period.clouds.map((cloud, i) => (
              <div 
                key={i}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded"
              >
                {cloud.type} {cloud.height} ft
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Weather Conditions */}
      {period.conditions && period.conditions.length > 0 && (
        <div className="mt-3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Conditions:</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {period.conditions.map((condition, i) => (
              <div 
                key={i}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded"
              >
                {condition.code} - {condition.description}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// NavCanada-style TAF formatting: header on first line, forecast period on second, main groups indented, RMK not indented
function formatTaf(taf: string): string {
  taf = taf.trim().replace(/=+$/, '');
  const tokens = taf.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  let indentLevel = 0;
  let afterHeader = false;

  const mainKeywords = ['FM', 'BECMG', 'TEMPO', 'PROB', 'RMK'];

  function isKeyword(token: string) {
    return mainKeywords.some(k => token.startsWith(k));
  }

  tokens.forEach((token, idx) => {
    if (idx === 0) {
      currentLine = token;
    } else if (!afterHeader && !isKeyword(token)) {
      currentLine += ' ' + token;
    } else if (!afterHeader && isKeyword(token)) {
      lines.push(currentLine);
      currentLine = token;
      afterHeader = true;
      indentLevel = token === 'FM' ? 0 : 1;
    } else if (isKeyword(token)) {
      if (currentLine) lines.push('  '.repeat(indentLevel) + currentLine);
      indentLevel = token === 'FM' ? 0 : 1;
      currentLine = token;
    } else {
      currentLine += ' ' + token;
    }
  });
  if (currentLine) lines.push('  '.repeat(indentLevel) + currentLine);
  return lines.join('\n');
}

const TafDisplay: React.FC<TafDisplayProps> = ({ data, hideSimplified = false, hideTitle = false }) => {
  // Support both legacy (forecast) and new (periods) keys for compatibility
  const periods = (data && (data.periods || (data as any).forecast)) || [];
  const issued = (data && (data.issue_time || (data as any).issued)) || '';
  const validFrom = data.startValidity || data.valid_time || (data as any).valid_from || '';
  const validTo = data.endValidity || data.valid_time || (data as any).valid_to || '';
  const tafIssueTime = (data.issue_time || (data as any).issued) || '';

  if (!data || !Array.isArray(periods) || periods.length === 0) {
    return (
      <div className="card p-4 animate-fade-in print:hidden">
        <h3 className="text-xl font-medium">TAF</h3>
        <div className="text-gray-500 dark:text-gray-400 mt-2">No TAF data available.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in print:hidden">
      {!hideTitle && <h3 className="text-xl font-medium">TAF</h3>}
      {/* Always show raw TAF */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 font-mono text-sm overflow-x-auto mb-4">
        {data.raw}
      </div>
      {/* Only show simplified/parsed view if not hidden */}
      {!hideSimplified && (
        <>
          <div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
              {validFrom && validTo && (
                <div className="flex items-center">
                  <Calendar size={14} className="mr-1" />
                  <span>Valid: {formatDateFromZulu(validFrom)} - {formatDateFromZulu(validTo)}</span>
                </div>
              )}
              {issued && (
                <div className="flex items-center">
                  <Clock size={14} className="mr-1" />
                  <span>Issued: {formatDateFromZulu(issued)}</span>
                </div>
              )}
            </div>
          </div>
          <pre className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 font-mono text-sm overflow-x-auto whitespace-pre-line">
            {formatTaf(data.raw)}
          </pre>
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Forecast Periods</h4>
            <div className="space-y-3">
              {periods.map((period, index) => (
                <ForecastPeriod key={index} period={period} index={index} tafIssueTime={tafIssueTime} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TafDisplay;