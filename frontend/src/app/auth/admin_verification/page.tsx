'use client';
import { useState } from 'react';
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

export default function AdminOTPVerification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLoadingPage, setShowLoadingPage] = useState<boolean>(false);

  // Optionally, get admin id or email from query params if needed
  const adminId = searchParams.get('admin_id') || '';

  const handleResendOtp = async () => {
    setError('');
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/auth/admin/resend_otp`, { admin_id: adminId });
      setError('A new OTP has been sent to your email.');
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/admin/verify_otp`, {
        otp,
        admin_id: adminId,
      });

      if (response.data.verified) {
        // Store token for future requests
        if (response.data.token) {
          localStorage.setItem('admin_token', response.data.token);
        }
        setShowLoadingPage(true);
        setTimeout(() => {
          router.push('/admin/dashboard');
        }, 2000);
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ErrorResponse>;
        const msg = axiosError.response?.data?.message || axiosError.message || 'Verification failed';
        if (msg.toLowerCase().includes('expired')) {
          setError('Your OTP has expired. Please request a new one.');
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
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Admin OTP Verification</h2>
              <p className="mb-6 text-gray-600">
                Enter the One-Time Password (OTP) sent to your email to verify your admin account.
              </p>
              {error && (
                <div className="rounded-md bg-red-50 p-4 mb-4">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    {error.toLowerCase().includes('expired') && (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-sm text-red-800 underline self-start"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Resending...' : 'Resend OTP'}
                      </button>
                    )}
                  </div>
                </div>
              )}
              <form className="space-y-4 text-gray-500" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="otp" className="sr-only">
                    OTP
                  </label>
                  <input
                    id="otp"
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    required
                    className="block w-full rounded-md border text-gray-700 border-gray-300 px-3 py-2 shadow-sm focus:border-red-800 focus:ring-red-800"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-md bg-gradient-to-r from-red-700/95 to-red-800 px-4 py-2 text-white font-medium shadow-sm 
                      bg-[length:200%_100%] bg-right transition-[background-position] duration-300
                      hover:bg-left focus:outline-none focus:ring-2 focus:ring-red-800 disabled:opacity-75"
                  >
                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}