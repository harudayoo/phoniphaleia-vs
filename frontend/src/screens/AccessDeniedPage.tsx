import React from 'react';
import Link from 'next/link';
import SystemLogoNoText from '@/components/SystemLogoNoText';

const AccessDeniedPage: React.FC = () => (
<div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-white via-red-100 to-yellow-100 px-4">
    <div className="flex flex-col items-center">
        <div className="flex items-center justify-center">
            <span className="text-[7rem] sm:text-[10rem] font-bold leading-none">4</span>
            <div className="mx-4 flex items-center justify-center">
                <SystemLogoNoText width={112} height={112} className="sm:w-40 sm:h-40 w-28 h-28" />
            </div>
            <span className="text-[7rem] sm:text-[10rem] font-bold leading-none">4</span>
        </div>
        <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold text-center">PAGE ENCRYPTED<br className="hidden sm:block"/>BEYOND RECOGNITION</h1>
        <p className="mt-8 text-lg text-center max-w-xl text-gray-800">
            It seems like this page got so secure,<br />even we can’t access it.
        </p>
    </div>
    <div className="mt-16 text-center w-full">
        <Link href="/user/dashboard" passHref legacyBehavior>
            <a className="text-lg text-gray-900 font-normal">Go back to the <span className="font-bold underline hover:text-blue-600 transition-colors">home page</span>.</a>
        </Link>
    </div>
</div>
);

export default AccessDeniedPage;
