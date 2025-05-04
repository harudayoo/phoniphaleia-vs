import React from 'react';
import Loader1 from '@/components/Loader1';

const LoadingPage: React.FC = () => (
  <div className="relative flex min-h-screen overflow-hidden">
    {/* Background image */}
    <div
      className="absolute inset-0 z-0"
      style={{
        backgroundImage: "url('/usep-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.95,
      }}
    />
    {/* Darker gradient overlay on top of background */}
    <div
      className="absolute inset-0 z-10"
      style={{
        background: 'linear-gradient(135deg, rgba(17,24,39,0.92) 80%, rgba(31,41,55,0.98) 100%)',
        opacity: 1,
        mixBlendMode: 'normal',
      }}
    />
    {/* Content absolutely positioned at bottom-right */}
    <div className="absolute z-20 bottom-0 right-0 flex flex-row items-center p-10">
      <p
        className="mr-4 text-gray-200 text-xl font-bold text-left max-w-xl animate-pulse"
        style={{ animationDuration: '1.5s' }}
      >
        You&apos;ll be redirected to the dashboard shortly . . .
      </p>
      <Loader1 size={150} />
    </div>
  </div>
);

export default LoadingPage;