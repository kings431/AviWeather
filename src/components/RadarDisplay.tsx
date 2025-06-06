import React, { useEffect, useState, useRef } from 'react';

interface RadarDisplayProps {
  icao: string;
}

const RadarDisplay: React.FC<RadarDisplayProps> = ({ icao }) => {
  const [frames, setFrames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/radar?station=${icao}`)
      .then(res => res.json())
      .then(data => {
        setFrames(data.frames || []);
        setFrameIdx((data.frames?.length || 1) - 1); // default to latest
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load radar images');
        setLoading(false);
      });
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [icao]);

  useEffect(() => {
    if (playing && frames.length > 1) {
      intervalRef.current = setInterval(() => {
        setFrameIdx(idx => (idx + 1) % frames.length);
      }, 600);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return () => {};
    }
  }, [playing, frames.length]);

  if (loading) return <div>Loading radar...</div>;
  if (error || !frames.length) return <div className="text-sm text-gray-500">No radar data available.</div>;

  const frame = frames[frameIdx];
  const imageUrl = `https://plan.navcanada.ca/weather/images/${frame.imageId}.image`;
  const validDate = frame.validTime ? new Date(frame.validTime + 'Z') : null;
  const validTime = validDate ? validDate.toUTCString() : '';
  const minutesAgo = validDate
    ? Math.floor((Date.now() - validDate.getTime()) / 60000)
    : '';

  return (
    <div className="card mt-6">
      <h3 className="text-lg font-semibold mb-2">Radar</h3>
      <img src={imageUrl} alt="Radar" className="w-full h-auto mx-auto" />
      <div className="flex items-center gap-2 mt-2">
        <button
          className="px-2 py-1 rounded bg-primary-600 text-white text-xs hover:bg-primary-700"
          onClick={() => setPlaying(p => !p)}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={frameIdx}
          onChange={e => setFrameIdx(Number(e.target.value))}
          className="flex-1"
        />
      </div>
      <div className="text-center text-xs mt-2">
        {validTime && <div>{validTime}</div>}
        {minutesAgo !== '' && <div>{minutesAgo} minutes ago</div>}
      </div>
    </div>
  );
};

export default RadarDisplay; 