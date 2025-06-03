'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import UsepStudents1 from '@/components/UsepStudents1';
import SystemLogo1 from '@/components/SystemLogo1';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface LoginFormData {
  student_id: string;
  password: string;
}

interface ErrorResponse {
  message?: string;
}

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [capsLockOn, setCapsLockOn] = useState<boolean>(false);
 
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();
  
  // Detect caps lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.getModifierState('CapsLock')) {
        setCapsLockOn(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.getModifierState('CapsLock')) {
        setCapsLockOn(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
 
  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      setIsLoading(true);
      
      const response = await axios.post(`${API_URL}/auth/login`, {
        student_id: data.student_id,
        password: data.password
      });
      
      if (response.data.student_id) {
        // If login successful, redirect to verification page with student_id
        router.push(`/auth/verification?student_id=${response.data.student_id}`);
      } else {
        setError('Invalid response from server');
      }
      
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ErrorResponse>;
        if (axiosError.code === 'ERR_NETWORK') {
          setError('Network error: Please check your connection or server status');
        } else {
          setError(axiosError.response?.data?.message || axiosError.message || 'Login failed');
        }
      } else {
        setError('Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      {/* Main content */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-7xl">
          {/* Logo + Login Form */}
          <div className="flex flex-col items-center justify-center">
            {/* System Logo */}
            <div className="mb-6 flex justify-center w-full">
              <SystemLogo1 width={120} style={{ maxWidth: '220px', height: 'auto' }} />
            </div>
            {/* Login Form */}
            <div className="border border-gray-200 rounded-lg shadow-sm bg-white p-6 md:p-8 w-full max-w-lg">
              <h2 className="text-2xl font-bold mb-2 text-gray-800">Your vote matters!</h2>
              <p className="mb-6 text-gray-600">Please login to get started.</p>
              
              {error && (
                <div className="rounded-md bg-red-50 p-4 mb-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}
              
              <form className="space-y-4 text-gray-500" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <label htmlFor="student_id" className="sr-only">
                    Student ID number
                  </label>
                  <input
                    id="student_id"
                    type="text"
                    placeholder="Student ID number"
                    autoComplete="username"
                    {...register('student_id', { 
                      required: 'Student ID is required',
                      pattern: {
                        value: /^[0-9]{4}-[0-9]{5}$/,
                        message: 'Please enter a valid student ID format (e.g. 2023-12345)'
                      }
                    })}
                    className="block w-full rounded-md border text-gray-700 border-gray-300 px-3 py-2 shadow-sm focus:border-red-800 focus:ring-red-800"
                  />
                  {errors.student_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.student_id.message}</p>
                  )}                </div>
                
                <div className="relative mt-8">
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  {capsLockOn && (
                    <div className="absolute -top-6 left-0 text-xs text-red-600">
                      Caps Lock is on
                    </div>
                  )}
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    autoComplete="current-password"
                    {...register('password', { required: 'Password is required' })}
                    className="block w-full rounded-md text-gray-700 border border-gray-300 px-3 py-2 shadow-sm focus:border-red-800 focus:ring-red-800 pr-10"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-md bg-gradient-to-r from-red-700/95 to-red-800 px-4 py-2 text-white font-medium shadow-sm 
                    bg-[length:200%_100%] bg-right transition-[background-position] duration-300
                    hover:bg-left focus:outline-none focus:ring-2 focus:ring-red-800 disabled:opacity-75"
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>
              </form>
              
              <div className="mt-4">
                <button className="text-sm text-red-800 hover:underline">
                  Forgot password?
                </button>
              </div>
              
              <div className="mt-6 flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <div className="mx-4 text-gray-500 text-sm">or</div>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-600">Don&apos;t have an account yet?</p>
                <Link href="/auth/register">
                  <button
                    className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-800"
                  >
                    Register Now
                  </button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Image/Logo Section */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-full max-w-md aspect-square rounded-lg flex items-center justify-center bg-gray-50">
              {/* Adding priority prop to optimize LCP */}
              <UsepStudents1 style={{ width: '100%', height: 'auto' }} priority />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}