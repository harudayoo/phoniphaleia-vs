'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Dynamically import LoadingPage to avoid SSR issues
const LoadingPage = dynamic(() => import('@/screens/LoadingPage'), { ssr: false });

interface ErrorResponse {
  message?: string;
}

function UserVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLoadingPage, setShowLoadingPage] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(0);

  // Get student ID from query params
  const studentId = searchParams.get('student_id') || '';

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleResendOtp = async () => {
    setError('');
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/auth/resend_otp`, { student_id: studentId });
      setError('A new verification code has been sent to your email.');
      setResendTimer(30); // Set timer for 30 seconds
    } catch {
      setError('Failed to resend verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/verify_otp`, {
        student_id: studentId,
        otp: otp
      });

      if (response.data.verified) {
        // Store token for future requests
        localStorage.setItem('voter_token', response.data.token);
        
        // Store user info if available
        if (response.data.voter) {
          localStorage.setItem('user', JSON.stringify(response.data.voter));
        }
        
        // Show loading page first
        setShowLoadingPage(true);
        
        // Use a timeout to allow localStorage to settle
        setTimeout(() => {
          router.push('/user/dashboard');
        }, 2000);
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ErrorResponse>;
        const msg = axiosError.response?.data?.message || axiosError.message || 'Verification failed';
        if (msg.toLowerCase().includes('expired')) {
          setError('Your verification code has expired. Please request a new one.');
        } else {
          setError(msg);
        }
      } else {
        setError('Verification failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showLoadingPage) {
    return <LoadingPage />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="flex w-full justify-center items-center">
          <div className="w-full max-w-md">
            <div className="border border-gray-200 rounded-lg shadow-sm bg-white p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Identity Verification</h2>
              <p className="mb-6 text-gray-600 text-center">
                Enter the verification code sent to your email to confirm your identity and access your account.
              </p>
              {error && (
                <div className={`rounded-md p-4 mb-4 ${error.toLowerCase().includes('sent to your email') ? 'bg-green-50' : 'bg-red-50'}`}> 
                  <div className="flex flex-col gap-2">
                    <h3 className={`text-sm font-medium ${error.toLowerCase().includes('sent to your email') ? 'text-green-800' : 'text-red-800'}`}>{error}</h3>
                    {error.toLowerCase().includes('expired') && (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-sm text-red-800 underline self-start"
                        disabled={isLoading || resendTimer > 0}
                      >
                        {isLoading ? 'Resending...' : resendTimer > 0 ? `Resend verification code (${resendTimer}s)` : 'Resend verification code'}
                      </button>
                    )}
                  </div>
                </div>
              )}
              <form className="space-y-4 text-gray-500" onSubmit={handleSubmit}>
                <div className="flex flex-col items-center">
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md w-full">
                    <p className="text-sm text-blue-700 text-center">
                      <span className="font-medium">Can&apos;t find the code?</span> Please check your spam or junk folder.
                    </p>
                  </div>
                  <label htmlFor="otp" className="sr-only">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    placeholder="Enter verification code"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    required
                    className="block w-full rounded-md border text-center text-gray-700 border-gray-300 px-3 py-2 shadow-sm focus:border-red-800 focus:ring-red-800"
                  />
                </div>
                <div className="flex flex-col space-y-3 items-center">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-md bg-gradient-to-r from-red-700/95 to-red-800 px-4 py-2 text-white font-medium shadow-sm 
                      bg-[length:200%_100%] bg-right transition-[background-position] duration-300
                      hover:bg-left focus:outline-none focus:ring-2 focus:ring-red-800 disabled:opacity-75"
                  >
                    {isLoading ? 'Verifying...' : 'Verify Identity'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading || resendTimer > 0}
                    className="text-sm text-red-800 hover:underline self-center disabled:opacity-60"
                  >
                    {isLoading ? 'Processing...' : resendTimer > 0 ? `Resend verification code (${resendTimer}s)` : 'Resend verification code'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>      <Footer />
    </div>
  );
}

export default function UserVerification() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="flex w-full justify-center items-center">
            <div className="w-full max-w-md">
              <div className="border border-gray-200 rounded-lg shadow-sm bg-white p-6 md:p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Identity Verification</h2>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading...</p>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <UserVerificationContent />
    </Suspense>
  );
}