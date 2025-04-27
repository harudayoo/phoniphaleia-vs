'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import ZKPService from '@/services/zkpservice'; // Adjust the import path as necessary

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
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();
  
  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      setIsLoading(true);
      
      // Use ZKPService to hash credentials
      const passwordHash = ZKPService.hashCredentials(data.student_id, data.password);
      
      // Send login request with hashed password
      const response = await axios.post(`${API_URL}/auth/login`, {
        student_id: data.student_id,
        password_hash: passwordHash // Send hash instead of plain password
      });
      
      // Store authentication token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('voter', JSON.stringify(response.data.voter));
      
      // Redirect to voting dashboard
      router.push('/dashboard');
      
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ErrorResponse>;
        setError(axiosError.response?.data?.message || axiosError.message || 'Login failed');
      } else {
        setError('Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-800 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 relative">
              {/* Logo placeholder */}
              <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
                <div className="text-white text-xs">X</div>
              </div>
            </div>
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
            <div className="w-10 h-10 relative">
              {/* Logo placeholder */}
              <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
                <div className="text-white text-xs">X</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
          {/* Login Form */}
          <div className="border border-gray-200 rounded-lg shadow-sm bg-white p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Your vote matters!</h2>
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
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-800 focus:ring-red-800"
                />
                {errors.student_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.student_id.message}</p>
                )}
              </div>

              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required' })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-800 focus:ring-red-800 pr-10"
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
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-md bg-red-800 px-4 py-2 text-white font-medium shadow-sm hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-800 disabled:opacity-75"
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
          
          {/* Image/Logo Section */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-full max-w-md aspect-square border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
              {/* This is where you could add your voting system logo or illustration */}
              <div className="w-full h-full relative flex items-center justify-center">
                <div className="text-6xl text-gray-300">USeP</div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-red-800 text-white p-4">
        <div className="container mx-auto">
          <div className="flex flex-col items-center justify-center">
            <div className="flex space-x-4 mb-2">
              {/* Social icons */}
              <div className="w-6 h-6 border border-white rounded flex items-center justify-center">
                <span className="text-xs">X</span>
              </div>
              <div className="w-6 h-6 border border-white rounded flex items-center justify-center">
                <span className="text-xs">X</span>
              </div>
              <div className="w-6 h-6 border border-white rounded flex items-center justify-center">
                <span className="text-xs">X</span>
              </div>
            </div>
            <p className="text-sm text-center">
              © 2025 University of Southeastern Philippines. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}