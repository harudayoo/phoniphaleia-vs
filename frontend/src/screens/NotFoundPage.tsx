import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-white via-red-100 to-yellow-100 px-4">
    <div className="flex flex-col md:flex-row items-center justify-center w-full max-w-5xl mx-auto">
      <div className="flex-shrink-0 flex items-center justify-center w-[320px] h-[320px] border border-gray-300 bg-white">
        <Image
          src="/PaperError2.png"
          alt="Ballot Not Found"
          width={320}
          height={320}
          className="object-contain w-full h-full"
          style={{ maxWidth: 320, maxHeight: 320 }}
        />
      </div>
      <div className="md:ml-12 mt-8 md:mt-0 flex-1 flex flex-col items-center md:items-start">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center md:text-left">Error 404:<br />Ballot Not Found.</h1>
        <p className="mt-6 text-lg text-gray-800 text-center md:text-left max-w-md">
          It appears the page you were looking for has been misplaced, much like a stray vote!<br /><br />
          Don&apos;t worry, your vote for finding the right page still counts!
        </p>
        <div className="mt-10 w-full flex justify-center md:justify-start">
          <Link href="/user/votes" passHref legacyBehavior>
            <a className="rounded-full border border-gray-700 px-6 py-2 text-lg font-normal hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
              Head Back to the <span className="font-bold">Booth (Homepage)</span>
            </a>
          </Link>
        </div>
      </div>
    </div>
  </div>
);

export default NotFoundPage;
