import React, { useEffect, useState } from 'react';

interface GfaImageProps {
  station: string;
  type: 'CLDWX' | 'TURBC';
}

interface GfaImageMeta {
  id: number;
  validFrom: string;
  validTo: string;
}

const formatZuluTime = (iso: string) => {
  try {
    const date = new Date(iso);
    let hour = date.getUTCHours();
    // Find the next main Zulu hour (00, 06, 12, 18)
    const mainHours = [0, 6, 12, 18];
    let nextMainHour = mainHours.find(h => hour < h);
    if (nextMainHour === undefined) nextMainHour = 0; // wrap to next day
    let day = date.getUTCDate();
    if (nextMainHour === 0 && hour >= 18) {
      // If wrapping to next day
      const nextDay = new Date(date);
      nextDay.setUTCDate(day + 1);
      day = nextDay.getUTCDate();
    }
    return `${String(day).padStart(2, '0')} ${String(nextMainHour).padStart(2, '0')}00Z`;
  } catch {
    return iso;
  }
};

const MAIN_ZULU_HOURS = ['00', '12', '18'];

const filterMainGfaTimes = (images: GfaImageMeta[]) => {
  return images.filter(img => {
    const date = new Date(img.validFrom);
    const hour = String(date.getUTCHours()).padStart(2, '0');
    return MAIN_ZULU_HOURS.includes(hour);
  });
};

const getMainGfaTimes = (images: GfaImageMeta[]) => {
  // Sort by validFrom ascending
  const sorted = [...images].sort((a, b) => new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime());
  // Pick up to 3 unique times (latest 3)
  return sorted.slice(-3);
};

const getThreeMainGfaTimes = (images: GfaImageMeta[]) => {
  // Group by hour/minute string (e.g., '1200', '1900', '0000')
  const uniqueTimes = new Map<string, GfaImageMeta>();
  images.forEach(img => {
    const date = new Date(img.validFrom);
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    const key = `${hour}${minute}`;
    // Always keep the latest image for each time key
    uniqueTimes.set(key, img);
  });
  // Sort by validFrom and take the last 3
  return Array.from(uniqueTimes.values())
    .sort((a, b) => new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime())
    .slice(-3);
};

const getLastThreeImages = (images: GfaImageMeta[]) => {
  // Just take the last 3 images in the order received
  return images.slice(-3);
};

const GfaImage: React.FC<GfaImageProps> = ({ station, type }) => {
  const [images, setImages] = useState<GfaImageMeta[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setImages([]);
    setSelectedIdx(0);
    fetch(`/api/gfa?station=${station}&type=${type}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch GFA image list');
        const data = await res.json();
        if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
          throw new Error('No GFA images found');
        }
        setImages(data.images);
        // Do not set selectedIdx here; will set after filtering
      })
      .catch((err) => {
        setError(err.message || 'Image fetch failed');
      })
      .finally(() => setLoading(false));
  }, [station, type]);

  const filteredImages = getLastThreeImages(images);

  // Ensure selectedIdx is always valid for filteredImages
  React.useEffect(() => {
    if (filteredImages.length > 0) {
      setSelectedIdx(filteredImages.length - 1); // Default to latest in filtered
    }
  }, [images.length]);

  // Clamp selectedIdx to valid range
  const safeIdx = Math.max(0, Math.min(selectedIdx, filteredImages.length - 1));
  const selectedImage = filteredImages[safeIdx] || filteredImages[0];
  const imageUrl = selectedImage ? `https://plan.navcanada.ca/weather/images/${selectedImage.id}.image` : '';

  return (
    <div>
      {/* Print-only: show last 6 images in a 2x3 grid, no UI */}
      {images.length > 0 && (
        <div className="print:grid print:grid-cols-3 print:grid-rows-2 print:gap-2 print:w-full hidden">
          {images.slice(-6).map((img) => (
            <img
              key={img.id}
              src={`https://plan.navcanada.ca/weather/images/${img.id}.image`}
              alt={`GFA ${type} for ${station} valid at ${formatZuluTime(img.validFrom)}`}
              style={{ maxWidth: '250px', width: '100%', display: 'block' }}
              className="print:mx-auto print:my-0"
            />
          ))}
        </div>
      )}
      {/* Normal UI (hidden in print) */}
      <div className="print:hidden">
        {loading && <p>Loading image...</p>}
        {error && <p className="text-danger-600">{error}</p>}
        {filteredImages.length > 0 && !loading && !error && (
          <>
            <div className="flex gap-2 mb-2 justify-center">
              {filteredImages.map((img, idx) => (
                <button
                  key={img.id}
                  className={`px-3 py-1 rounded ${safeIdx === idx ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
                  onClick={() => setSelectedIdx(idx)}
                >
                  {formatZuluTime(img.validFrom)}
                </button>
              ))}
            </div>
            <img
              src={imageUrl}
              alt={`GFA ${type} for ${station} valid at ${formatZuluTime(selectedImage.validFrom)}`}
              style={{ maxWidth: '100%' }}
            />
            <div className="text-xs text-gray-500 mt-2 text-center">
              Valid at: {formatZuluTime(selectedImage.validFrom)} UTC
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GfaImage; 