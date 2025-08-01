import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '../components/Footer';
import SystemLogo2 from '../components/SystemLogo2';

const NotVerifiedPage: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-gradient-to-tr from-white to-yellow-100 px-4">
    {/* System Logo centered above the error message */}
      <div className="mt-15 mb-6 flex justify-center">
        <SystemLogo2 width={200} className="mx-auto" />
      </div>
    <div className="flex flex-col md:flex-row items-center justify-center w-full max-w-5xl mx-auto flex-1">
      <div className="flex-shrink-0 flex items-center justify-center w-[320px] h-[320px]">
        <Image
          src="/PaperError2.png"
          alt="Not Verified"
          width={320}
          height={320}
          className="object-contain w-full h-full drop-shadow-lg"
          style={{ maxWidth: 320, maxHeight: 320 }}
        />
      </div>
      <div className="md:ml-12 mt-8 md:mt-0 flex-1 flex flex-col items-center md:items-start">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-red-900 text-center md:text-left">Verification Required</h1>
        <p className="mt-6 text-lg text-gray-800 text-center md:text-left max-w-md">
          Uh-oh! It looks like you don&apos;t have access to this page yet.<br /><br />
          Please verify your student or enrollment status to continue.
        </p>
        <div className="mt-10 w-full flex justify-center md:justify-start">
            <Link
            href="/user/votes"
            className="inline-flex items-center gap-2 rounded-lg bg-white/80 border border-gray-300 px-5 py-2 text-base font-medium text-gray-800 shadow-sm hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to <span className="font-semibold">Home</span>
            </Link>
        </div>
      </div>
    </div>
    {/* Footer stays at the bottom and covers full width */}
    <div className="w-screen relative left-1/2 right-1/2 -mx-[50vw]">
      <Footer />
    </div>
  </div>
);

export default NotVerifiedPage;
