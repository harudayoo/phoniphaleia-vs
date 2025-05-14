import React from 'react';
import Loader1 from '@/components/Loader1';
import SystemLogo2 from '@/components/SystemLogo2';

const LoadingPage: React.FC = () => (
  <div className="relative flex min-h-screen overflow-hidden">
    {/* Background image */}
    <div
      className="absolute inset-0 z-0"
      style={{
        backgroundImage: "url('/usep-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.8, // Lowered opacity for less noticeable background
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
    {/* Center-top logo */}
    <div className="absolute z-20 top-0 left-0 w-full flex justify-center pt-10">
      <SystemLogo2 width={220} height={120} />
    </div>
    {/* Centered content */}
    <div className="absolute z-20 inset-0 flex flex-col justify-center items-center pointer-events-none">
      <Loader1 size={110} />
      <p
        className="mt-8 text-gray-700 text-lg font-bold text-center max-w-xl"
        style={{ textShadow: '0 2px 8px rgba(255,255,255,0.7)' }}
      >
        Your Vote. Your Voice. Protected.
      </p>
    </div>
    {/* Center-bottom instructions */}
    <div className="absolute z-20 bottom-0 left-0 w-full flex flex-col items-center pb-10">
      <p className="text-gray-700 text-md font-normal text-center">Please do not close or reload the page</p>
      <p
        className="text-gray-700 text-md font-normal text-center animate-pulse mt-2"
        style={{ animationDuration: '1.5s' }}
      >
        This may take a while. Please wait.
      </p>
    </div>
  </div>
);

export default LoadingPage;