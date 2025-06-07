import React, { useEffect } from 'react';

interface UpdateIndicatorProps {
  lastUpdated?: number;
}

const UpdateIndicator: React.FC<UpdateIndicatorProps> = ({ lastUpdated }) => {
  useEffect(() => {
    const timer = setInterval(() => {}, 1000);
    return () => clearInterval(timer);
  }, []);
  if (typeof lastUpdated !== 'number') return null;
  // Hide in print
  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 print:hidden">
      Last updated: {lastUpdated}
    </div>
  );
};

export default UpdateIndicator;