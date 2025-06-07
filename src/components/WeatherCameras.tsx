import React, { useState } from 'react';

interface WeatherCamerasProps {
  icao: string;
}

const wxcamDirections = [
  { key: 'N', label: 'North View' },
  { key: 'NE', label: 'Northeast View' },
  { key: 'E', label: 'East View' },
  { key: 'SE', label: 'Southeast View' },
  { key: 'S', label: 'South View' },
  { key: 'SW', label: 'Southwest View' },
  { key: 'W', label: 'West View' },
  { key: 'NW', label: 'Northwest View' },
];

const WeatherCameras: React.FC<WeatherCamerasProps> = ({ icao }) => {
  const upperIcao = icao.toUpperCase();
  const isCanada = upperIcao.startsWith('C');
  const isUSA = upperIcao.startsWith('K');
  const [failed, setFailed] = useState<{ [key: string]: boolean }>({});
  const [enlarged, setEnlarged] = useState<string | null>(null);

  if (isCanada) {
    // Determine if all directions failed
    const allFailed = wxcamDirections.every((dir) => failed[dir.key]);
    return (
      <div className="card mt-6 print:contents">
        <h3 className="text-lg font-semibold mb-2 print:hidden">Weather Cameras</h3>
        {allFailed ? (
          <div className="text-gray-500 text-sm">No weathercams found for this airport.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
            {wxcamDirections.map((dir) => {
              if (failed[dir.key]) return null;
              const url = `https://www.metcam.navcanada.ca/dawc_images/wxcam/${upperIcao}/${upperIcao}_${dir.key}-full-e.jpeg`;
              return (
                <div key={dir.key} className="flex flex-col items-center mb-6 print:mb-2">
                  <span className="font-semibold mb-2 text-center print:text-xs">{dir.label}</span>
                  <img
                    src={url}
                    alt={`${upperIcao} ${dir.label}`}
                    className="rounded shadow-md max-w-xs print:max-w-[200px] print:shadow-none print:rounded-none"
                    loading="lazy"
                    onClick={() => setEnlarged(url)}
                    onError={() => {
                      setFailed((f) => ({ ...f, [dir.key]: true }));
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 text-sm text-gray-600 print:text-xs print:mt-2">
          Source: <a href={`https://www.metcam.navcanada.ca/lb/cameraSite.jsp?lang=e&id=${upperIcao}`} target="_blank" rel="noopener noreferrer" className="underline">NAV CANADA WxCam</a>
        </div>
        {/* Modal for enlarged image */}
        {enlarged && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setEnlarged(null)}>
            <div className="relative" onClick={e => e.stopPropagation()}>
              <img src={enlarged} alt="Enlarged WxCam" className="max-h-[80vh] max-w-[90vw] rounded shadow-lg" />
              <button
                className="absolute top-2 right-2 bg-white dark:bg-gray-800 rounded-full p-2 text-gray-700 dark:text-gray-200 shadow hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => setEnlarged(null)}
                aria-label="Close enlarged image"
              >
                &times;
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isUSA) {
    // FAA WeatherCams search link
    const faaUrl = `https://weathercams.faa.gov/?search=${upperIcao}`;
    return (
      <div className="card mt-4">
        <h3 className="text-lg font-semibold mb-2">Weather Cameras</h3>
        <a
          href={faaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-primary-600 hover:text-primary-800"
        >
          View FAA Weather Cameras for {upperIcao}
        </a>
        <div className="text-xs text-gray-500 mt-2">
          Source: <a href="https://weathercams.faa.gov/" target="_blank" rel="noopener noreferrer" className="underline">FAA WeatherCams</a>
        </div>
      </div>
    );
  }

  return (
    <div className="card mt-4">
      <h3 className="text-lg font-semibold mb-2">Weather Cameras</h3>
      <div className="text-gray-500 text-sm">No weather cameras available for this airport.</div>
    </div>
  );
};

export default WeatherCameras;