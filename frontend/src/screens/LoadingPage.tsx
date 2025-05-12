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
        opacity: 0.4, // Lowered opacity for less noticeable background
      }}
    />
    {/* Lighter gradient overlay on top of background */}
    <div
      className="absolute inset-0 z-10"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 80%, rgba(245,245,245,0.98) 100%)',
        opacity: 1,
        mixBlendMode: 'normal',
      }}
    />
    {/* Centered content */}
    <div className="absolute z-20 inset-0 flex flex-col justify-center items-center">
      <Loader1 size={150} />
      <p
        className="mt-8 text-gray-700 text-xl font-bold text-center max-w-xl animate-pulse"
        style={{ animationDuration: '1.5s', textShadow: '0 2px 8px rgba(255,255,255,0.7)' }}
      >
        You&apos;ll be redirected to the dashboard shortly . . .
      </p>
    </div>
  </div>
);

export default LoadingPage;