import React, { useEffect, useState } from 'react';

interface UpdateIndicatorProps {
  lastUpdated?: number;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000); // seconds
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return new Date(timestamp).toLocaleString();
}

const UpdateIndicator: React.FC<UpdateIndicatorProps> = ({ lastUpdated }) => {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (typeof lastUpdated !== 'number') return;
    const update = () => setDisplay(formatTimeAgo(lastUpdated));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  if (typeof lastUpdated !== 'number') return null;
  // Hide in print
  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 print:hidden">
      Last updated: {display}
    </div>
  );
};

export default UpdateIndicator;