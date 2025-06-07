import React, { useEffect, useState, useRef } from 'react';

interface RadarDisplayProps {
  icao: string;
}

type RadarType = 'echotop' | 'rain' | 'snow';

const RADAR_LABELS: Record<RadarType, string> = {
  echotop: 'ECHOTOP',
  rain: 'CAPPI (RAIN)',
  snow: 'CAPPI (SNOW)',
};

const RadarDisplay: React.FC<RadarDisplayProps> = ({ icao }) => {
  const [frames, setFrames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [radarType, setRadarType] = useState<RadarType>('echotop');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setFrames([]);
    fetch(`/api/radar?icao=${icao}&type=${radarType}`)
      .then(res => res.json())
      .then(data => {
        // Flatten all frames from all returned radar products
        const flatFrames: any[] = [];
        (data.frames || []).forEach((product: any) => {
          (product.frames || []).forEach((outerFrame: any) => {
            (outerFrame.frames || []).forEach((innerFrame: any) => {
              (innerFrame.images || []).forEach((img: any) => {
                flatFrames.push({
                  imageId: img.id,
                  validTime: innerFrame.sv,
                  endTime: innerFrame.ev,
                  created: img.created,
                  imageUrl: `/api/radar/image?id=${img.id}`,
                  location: product.location,
                });
              });
            });
          });
        });
        setFrames(flatFrames);
        setFrameIdx((flatFrames.length || 1) - 1); // default to latest
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load radar images');
        setLoading(false);
      });
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [icao, radarType]);

  useEffect(() => {
    if (frames.length > 1) {
      intervalRef.current = setInterval(() => {
        setFrameIdx(idx => (idx + 1) % frames.length);
      }, 600);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return () => {};
    }
  }, [frames.length]);

  if (loading) return <div>Loading radar...</div>;
  if (error || !frames.length) return <div className="text-sm text-gray-500">No radar data available.</div>;

  return (
    <div className="card mt-6 print:contents">
      <h3 className="text-lg font-semibold mb-2 print:hidden">Radar</h3>
      <div className="flex gap-2 mb-2 print:hidden">
        {(['echotop', 'rain', 'snow'] as RadarType[]).map(type => (
          <button
            key={type}
            className={`px-3 py-1 rounded ${radarType === type ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
            onClick={() => setRadarType(type)}
          >
            {RADAR_LABELS[type]}
          </button>
        ))}
      </div>
      <div className="flex flex-col items-center print:grid print:grid-cols-1 print:gap-2 print:items-start print:justify-start">
        {frames.length > 0 ? (
          <img
            src={frames[frameIdx].imageUrl}
            alt="Radar"
            className="rounded shadow-md max-w-lg w-full h-auto print:max-w-[350px] print:rounded-none print:shadow-none print:w-auto print:h-auto"
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <div className="text-gray-500 dark:text-gray-400">No radar data available.</div>
        )}
      </div>
      <div className="mt-4 text-sm text-gray-600 print:text-xs print:mt-2">
        Source: <a href="https://weather.gc.ca/radar/index_e.html" target="_blank" rel="noopener noreferrer" className="underline">Environment Canada Radar</a>
      </div>
    </div>
  );
};

export default RadarDisplay;