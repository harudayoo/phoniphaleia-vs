import React from 'react';
import Link from 'next/link';
import SystemLogoNoText from '@/components/SystemLogoNoText';
import Footer from '../components/Footer';

const AccessDeniedPage: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-gradient-to-tr from-white to-yellow-100 px-4">
    <div className="flex flex-col items-center justify-center flex-1">
      <div className="flex items-center justify-center">
        <span className="text-[7rem] sm:text-[10rem] font-bold text-red-800 leading-none">4</span>
        <div className="mx-4 flex items-center justify-center">
          <SystemLogoNoText width={112} height={112} className="sm:w-40 sm:h-40 w-28 h-28" />
        </div>
        <span className="text-[7rem] sm:text-[10rem] font-bold text-red-800 leading-none">4</span>
      </div>
      <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold text-gray-900 text-center">
        PAGE ENCRYPTED<br className="hidden sm:block" />BEYOND RECOGNITION
      </h1>
      <p className="mt-8 text-lg text-center max-w-xl text-gray-800">
        It seems like this page got so secure,<br />even we can’t access it.
      </p>
      <div className="mt-10 w-full flex justify-center">
        <Link
          href="/user/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-white/80 border border-gray-300 px-5 py-2 text-base font-medium text-gray-800 shadow-sm hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Go back to the <span className="font-semibold">home page</span>
        </Link>
      </div>
    </div>
    {/* Footer stays at the bottom and covers full width */}
    <div className="w-screen relative left-1/2 right-1/2 -mx-[50vw]">
      <Footer />
    </div>
  </div>
);

export default AccessDeniedPage;
