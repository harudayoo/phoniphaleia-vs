// frontend/src/pages/index.tsx
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SystemLogo1 from '@/components/SystemLogo1';
import Loader3 from '@/components/Loader3';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Add slight delay to show the loading screen before redirecting
    const timeout = setTimeout(() => {
      router.push('auth/login');
    }, 2500);
    
    return () => clearTimeout(timeout);
  }, [router]);
  
  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-gray-50">
      {/* Animated corner element */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-60">
        <div className="corner-animation" />
      </div>
      
      {/* Logo and loader centered */}
      <div className="flex flex-col items-center gap-8 z-10">
        <div className="relative w-72 h-48">
          <SystemLogo1 width="auto" height="auto" />
        </div>
        <div className="mt-6">
          <Loader3 size={90} />
        </div>
      </div>
      
      <style jsx>{`
        .corner-animation {
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
          animation: pulse 4s infinite alternate ease-in-out;
        }
        
        @keyframes pulse {
          0% { transform: scale(1) rotate(0deg); opacity: 0.2; }
          100% { transform: scale(1.2) rotate(5deg); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}