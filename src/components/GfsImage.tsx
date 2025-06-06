import React, { useState, useEffect } from 'react';

interface GfaImageProps {
  station: string;
  type: string;
}

const GfaImage = ({ station, type }: GfaImageProps) => {
  const [imgSrc, setImgSrc] = useState<string>('');

  useEffect(() => {
    const fetchImg = async () => {
      try {
        const res = await fetch(`/api/gfa?station=${station}&type=${type}`);
        const blob = await res.blob();
        setImgSrc(URL.createObjectURL(blob));
      } catch (err) {
        // No console.error should remain in this file
      }
    };
    fetchImg();
  }, [station, type]);

  return (
    <div>
      {imgSrc ? (
        <img src={imgSrc} alt={`GFA ${type} for ${station}`} style={{ maxWidth: '100%' }} />
      ) : (
        <p>Loading image...</p>
      )}
    </div>
  );
};

export default GfaImage;