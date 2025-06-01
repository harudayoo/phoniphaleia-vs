'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import SystemLogo2 from '@/components/SystemLogo2';
import Footer from '../components/Footer';

interface WaitlistNotifPageProps {
  electionId: number;
  voterId: string;
  electionName: string;
}

const WaitlistNotifPage: React.FC<WaitlistNotifPageProps> = ({
  electionId,
  voterId,
  electionName
}) => {
  const router = useRouter();
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // Store queue status in sessionStorage for FloatingQueueTracker
  useEffect(() => {
    sessionStorage.setItem(`queue_${electionId}_${voterId}`, JSON.stringify({
      electionId,
      voterId,
      electionName,
      timestamp: Date.now()
    }));
  }, [electionId, voterId, electionName]);

  // Auto-redirect to waitlist page after 5 seconds
  useEffect(() => {
    if (redirectCountdown <= 0) return;
    const redirectTimer = setTimeout(() => {
      if (redirectCountdown === 1) {
        // Redirect to waitlist page with voter information
        router.push(`/user/votes/waitlist?election_id=${electionId}&voter_id=${voterId}`);
      } else {
        setRedirectCountdown(prev => prev - 1);
      }
    }, 1000);
    return () => clearTimeout(redirectTimer);
  }, [redirectCountdown, electionId, voterId, router]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-tr from-white to-yellow-100 px-4">
      {/* Redirect countdown notification */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏱️</span>
          <span className="font-semibold">
            Redirecting to queue page in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
          </span>
        </div>
      </div>

      {/* System Logo */}
      <div className="mt-15 mb-6 flex justify-center">
        <SystemLogo2 width={200} className="mx-auto" />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center w-full max-w-5xl mx-auto flex-1">
        {/* Waiting illustration */}
        <div className="flex-shrink-0 flex items-center justify-center w-[320px] h-[320px]">
          <Image
            src="/PaperError2.png"
            alt="Election Full"
            width={320}
            height={320}
            className="object-contain w-full h-full drop-shadow-lg"
            style={{ maxWidth: 320, maxHeight: 320 }}
          />
        </div>        {/* Content */}
        <div className="md:ml-12 mt-8 md:mt-0 flex-1 flex flex-col items-center md:items-start">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-green-600 text-center md:text-left">
            You&apos;re Eligible! Election is Currently Full
          </h1>
          
          <p className="mt-6 text-lg text-gray-800 text-center md:text-left max-w-md">
            <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-md font-semibold mb-2">✅ Eligibility Confirmed</span><br />
            You are <strong>eligible to vote</strong> in &quot;<strong>{electionName}</strong>&quot;.<br /><br />
            However, the election has reached its maximum concurrent voters to manage system load. You have been added to the waitlist and will be notified when it&apos;s your turn to vote.
          </p>

          {/* Eligibility status box */}
          <div className="mt-8 bg-green-50 border-l-4 border-green-400 p-4 rounded-lg max-w-md mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  <strong>Eligibility Verified:</strong> You meet all requirements to vote in this election. The wait is only due to system load management.
                </p>
              </div>
            </div>
          </div>

          {/* Notice box about waitlist and redirection */}
          <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg max-w-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Notice:</strong> You will be redirected to the queue management page where you can monitor your position and estimated wait time.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 w-full flex justify-center md:justify-start">
            <button
              onClick={() => router.push('/user/votes')}
              className="inline-flex items-center gap-2 rounded-lg bg-white/80 border border-gray-300 px-5 py-2 text-base font-medium text-gray-800 shadow-sm hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Return to Elections
            </button>
          </div>
        </div>
      </div>

      {/* Footer stays at the bottom and covers full width */}
      <div className="w-screen relative left-1/2 right-1/2 -mx-[50vw]">
        <Footer />
      </div>
    </div>
  );
};

export default WaitlistNotifPage;