import React, { useEffect, useState, useRef } from 'react';

interface RadarDisplayProps {
  icao: string;
}

const RadarDisplay: React.FC<RadarDisplayProps> = ({ icao }) => {
  const [frames, setFrames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/radar?icao=${icao}`)
      .then(res => res.json())
      .then(data => {
        // Flatten the nested frames/images structure from the API
        const flatFrames: any[] = [];
        (data.frames || []).forEach((outerFrame: any) => {
          (outerFrame.frames || []).forEach((innerFrame: any) => {
            (innerFrame.images || []).forEach((img: any) => {
              flatFrames.push({
                imageId: img.id,
                validTime: innerFrame.sv,
                endTime: innerFrame.ev,
                created: img.created,
                imageUrl: `/api/radar/image?id=${img.id}`
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
  }, [icao]);

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
      <div className="flex flex-col items-center print:grid print:grid-cols-1 print:gap-2 print:items-start print:justify-start">
        {frames.length > 0 ? (
          <img
            src={frames[frameIdx].imageUrl}
            alt="Radar"
            className="rounded shadow-md max-w-lg w-full h-auto print:max-w-[350px] print:rounded-none print:shadow-none print:w-auto print:h-auto"
            style={{ objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = 'text-gray-500 dark:text-gray-400';
              fallback.innerText = 'Radar image not available.';
              e.currentTarget.parentNode?.appendChild(fallback);
            }}
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