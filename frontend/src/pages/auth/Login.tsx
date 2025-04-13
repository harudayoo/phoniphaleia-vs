import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import axios, { AxiosError } from 'axios';
import ZKPService from '../../services/zkpService';
import Link from 'next/link';

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
  
  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Sign in to Voting System
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Using Zero-Knowledge Proof Authentication
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="student_id" className="block text-sm font-medium text-gray-700">
                Student ID
              </label>
              <div className="mt-1">
                <input
                  id="student_id"
                  type="text"
                  placeholder="e.g. 2023-12345"
                  autoComplete="username"
                  {...register('student_id', { 
                    required: 'Student ID is required',
                    pattern: {
                      value: /^[0-9]{4}-[0-9]{5}$/,
                      message: 'Please enter a valid student ID format (e.g. 2023-12345)'
                    }
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.student_id && (
                  <p className="mt-2 text-sm text-red-600">{errors.student_id.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required' })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-75"
              >
                {isLoading ? 'Verifying...' : 'Sign in'}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">
                Don&apos;t have an account?
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              <Link href="/auth/Register">
                <button
                  className="flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Register Now
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}