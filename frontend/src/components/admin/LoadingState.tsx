import React from 'react';
import Loader4 from '@/components/Loader4';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-xl shadow overflow-hidden border border-gray-200 p-8">
      <Loader4 size={60} />
      <p className="mt-4 text-gray-500">{message}</p>
    </div>
  );
};

export default LoadingState;