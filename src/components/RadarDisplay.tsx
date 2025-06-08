import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [prefetchedImages, setPrefetchedImages] = useState<(string | null)[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setFrames([]);
    setPrefetchedImages([]);
    fetch(`/api/radar?icao=${icao}&type=${radarType}`)
      .then(res => res.json())
      .then(async data => {
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
                  imageUrl: `https://plan.navcanada.ca/weather/images/${img.id}.image`,
                  location: product.location,
                });
              });
            });
          });
        });
        setFrames(flatFrames);
        setFrameIdx((flatFrames.length || 1) - 1); // default to latest

        // Prefetch all images as data URLs
        const imagePromises = flatFrames.map(frame =>
          fetch(frame.imageUrl)
            .then(res => res.blob())
            .then(blob => new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            }))
            .catch(() => null)
        );
        const images = await Promise.all(imagePromises);
        setPrefetchedImages(images);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load radar images');
        setLoading(false);
      });
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [icao, radarType]);

  useEffect(() => {
    if (isPlaying && frames.length > 1) {
      intervalRef.current = setInterval(() => {
        setFrameIdx(idx => (idx + 1) % frames.length);
      }, 600);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return () => {};
    }
  }, [frames.length, isPlaying]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFrameIdx(Number(e.target.value));
    setIsPlaying(false);
  };

  const handlePrev = () => {
    setFrameIdx(idx => (idx - 1 + frames.length) % frames.length);
    setIsPlaying(false);
  };

  const handleNext = () => {
    setFrameIdx(idx => (idx + 1) % frames.length);
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    setIsPlaying(p => !p);
  };

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
        {prefetchedImages.length > 0 && prefetchedImages[frameIdx] ? (
          <img
            src={prefetchedImages[frameIdx] || ''}
            alt="Radar"
            className="rounded shadow-md max-w-lg w-full h-auto print:max-w-[350px] print:rounded-none print:shadow-none print:w-auto print:h-auto"
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <div className="text-gray-500 dark:text-gray-400">No radar data available.</div>
        )}
        {/* Controls: slider, prev, next, play/pause */}
        {frames.length > 1 && (
          <div className="w-full max-w-lg mt-3 flex flex-col items-center gap-2">
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={frameIdx}
              onChange={handleSliderChange}
              className="w-full accent-blue-600 h-1 rounded-lg appearance-none bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ height: '6px' }}
            />
            <div className="flex justify-center items-center gap-3 w-full mt-1">
              <button
                onClick={handlePrev}
                aria-label="Previous frame"
                className="p-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                style={{ fontSize: 20 }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handlePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="p-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                style={{ fontSize: 20 }}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button
                onClick={handleNext}
                aria-label="Next frame"
                className="p-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                style={{ fontSize: 20 }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {frames[frameIdx].validTime ? (
                <>
                  {frames[frameIdx].validTime}Z
                  <span className="ml-2">{frames[frameIdx].created ? new Date(frames[frameIdx].created + 'Z').toISOString().replace('T', ' ').replace(/\..+/, '') + ' UTC' : ''}</span>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 text-sm text-gray-600 print:text-xs print:mt-2">
        Source: <a href="https://weather.gc.ca/radar/index_e.html" target="_blank" rel="noopener noreferrer" className="underline">Environment Canada Radar</a>
      </div>
    </div>
  );
};

export default RadarDisplay;