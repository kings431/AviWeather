import React, { useEffect, useState } from 'react';

interface UpdateIndicatorProps {
  lastUpdated?: number;
}

const UpdateIndicator: React.FC<UpdateIndicatorProps> = ({ lastUpdated }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!lastUpdated) return null;
  const secondsAgo = Math.floor((now - lastUpdated) / 1000);
  const nowDate = new Date(now);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const local = `${nowDate.getFullYear()}-${pad(nowDate.getMonth()+1)}-${pad(nowDate.getDate())} ${pad(nowDate.getHours())}:${pad(nowDate.getMinutes())}:${pad(nowDate.getSeconds())}`;
  const zulu = nowDate.toISOString().replace('T', ' ').replace(/\..+/, 'Z');
  return (
    <div className="flex flex-col gap-1 mb-2">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Data is fresh" />
        <span className="text-xs text-gray-400 ml-2">
          Last updated: {secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo/60)}m ago`}
        </span>
      </div>
    </div>
  );
};

export default UpdateIndicator; 