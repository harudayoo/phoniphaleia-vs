'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SystemLogo2 from '@/components/SystemLogo2';
import UsepStudent2 from '@/components/UsepStudents2';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface SuperAdminLoginFormData {
  username_or_email: string;
  password: string;
}

interface ErrorResponse {
  message?: string;
}

export default function SuperAdminLogin() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SuperAdminLoginFormData>();

  const onSubmit = async (data: SuperAdminLoginFormData) => {
    try {
      setError('');
      setIsLoading(true);

      const response = await axios.post(`${API_URL}/super_admin/login`, {
        username_or_email: data.username_or_email,
        password: data.password
      });

      // Expecting response.data.super_admin_id or similar identifier
      if (response.data.super_admin_id) {
        router.push(`/auth/super_admin_verification?super_admin_id=${response.data.super_admin_id}`);
      } else {
        setError('Invalid response from server');
      }
    } catch (err: unknown) {
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

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="flex w-full max-w-7xl mx-auto items-center justify-center gap-8">
          {/* Left side: USEP Student */}
          <div className="hidden md:flex flex-1 justify-center items-center">
            <div className="w-8/12 h-auto flex items-center justify-center">
              <UsepStudent2 />
            </div>
          </div>
          {/* Right side: Logo + Form */}
          <div className="flex flex-col flex-1 items-center justify-center">
            <div className="mb-6 flex justify-center">
              <SystemLogo2 width={180} height={110} />
            </div>
            <div className="w-full max-w-lg">
              <div className="border border-gray-200 rounded-lg shadow-sm bg-white p-6 md:p-8">
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-gray-800">Super Admin Login</h2>
                  <p className="text-gray-600">Sign in to manage the system administrators.</p>
                </div>
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
                    <label htmlFor="username_or_email" className="sr-only">
                      Username or Email
                    </label>
                    <input
                      id="username_or_email"
                      type="text"
                      placeholder="Username or Email"
                      autoComplete="username"
                      {...register('username_or_email', { required: 'Username or Email is required' })}
                      className="block w-full rounded-md border text-gray-700 border-gray-300 px-3 py-2 shadow-sm focus:border-red-800 focus:ring-red-800"
                    />
                    {errors.username_or_email && (
                      <p className="mt-1 text-sm text-red-600">{errors.username_or_email.message}</p>
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
                    )}
                  </div>
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
                <div className="mt-4 flex flex-col gap-2 md:flex-row md:gap-4 justify-center">
                  <Link href="/auth/login">
                    <button className="text-sm text-red-800 hover:underline">
                      Student Login
                    </button>
                  </Link>
                  <Link href="/auth/admin_login">
                    <button className="text-sm text-red-800 hover:underline">
                      Admin Login
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
