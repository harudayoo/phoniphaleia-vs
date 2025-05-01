import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-red-800 text-white p-1 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Link
            href="/auth/login"
            className="w-10 h-10 relative group"
            title="Go to Login"
          >
            <Image
              src="/usep-logo.png"
              alt="USeP Logo"
              width={40}
              height={40}
              className="w-10 h-10 rounded-full border-2 border-white object-cover transition-transform duration-200 group-hover:scale-110 group-hover:border-yellow-400"
              priority
            />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-bold text-sm md:text-lg">One Data. One USeP.</h1>
            <p className="text-xs md:text-sm">Phonipháleia Online Voting System</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex flex-col items-end">
            <h2 className="font-bold text-sm md:text-lg">USeP Obrero</h2>
            <p className="text-xs md:text-sm">Student COMELEC</p>
          </div>
          <Link
            href="/auth/admin_register"
            className="w-10 h-10 relative group"
            title="Go to Admin Register"
          >
            <Image
              src="/comelec-logo.png"
              alt="COMELEC Logo"
              width={40}
              height={40}
              className="w-10 h-10 rounded-full border-2 border-white object-cover transition-transform duration-200 group-hover:scale-110 group-hover:border-yellow-400"
              priority
            />
          </Link>
        </div>
      </div>
    </header>
  );
}