"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface AdminRegisterFormData {
  id_number: string; // student ID number (format: 0000-00000)
  email: string;
  lastname: string;
  firstname: string;
  middlename?: string;
  username: string;
  password: string;
  confirm_password: string;
}

export default function AdminRegister() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue, // <-- add setValue
  } = useForm<AdminRegisterFormData>({
    mode: 'onChange',
    defaultValues: {
      id_number: '',
      email: '',
      lastname: '',
      firstname: '',
      middlename: '',
      username: '',
      password: '',
      confirm_password: '',
    },
  });

  // Watch the email field and enforce the suffix
  const emailValue = watch('email');
  const EMAIL_SUFFIX = '@usep.edu.ph';

  // Ensure the email always ends with the suffix
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Remove any existing suffix
    if (value.endsWith(EMAIL_SUFFIX)) {
      value = value.slice(0, -EMAIL_SUFFIX.length);
    }
    // Remove any accidental '@' or domain part
    value = value.replace(/@.*$/, '');
    setValue('email', value + EMAIL_SUFFIX, { shouldValidate: true });
  };

  const password = watch('password');

  const onSubmit = async (data: AdminRegisterFormData) => {
    if (
      !data.id_number ||
      !data.email ||
      !data.lastname ||
      !data.firstname ||
      !data.username ||
      !data.password
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setError('');
      setIsLoading(true);

      await axios.post(`${API_URL}/auth/admin_register`, {
        id_number: data.id_number,
        email: data.email,
        lastname: data.lastname,
        firstname: data.firstname,
        middlename: data.middlename,
        username: data.username,
        password: data.password,
      });

      router.push('/auth/login?registered=admin');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <Link href="/auth/admin_login" className="text-gray-500 hover:text-red-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <h2 className="text-xl font-bold text-center flex-grow text-red-800">Admin Registration</h2>
            </div>
            <p className="text-center text-gray-600 mb-6">Register as an admin to manage the system.</p>

            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="id_number" className="block text-sm font-medium text-gray-500">
                  ID Number <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="id_number"
                    type="text"
                    placeholder="e.g. 2023-12345"
                    {...register('id_number', {
                      required: 'Student ID number is required',
                      pattern: {
                        value: /^[0-9]{4}-[0-9]{5}$/,
                        message: 'ID Number must be in format 0000-00000',
                      },
                    })}
                    className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
                  />
                  {errors.id_number && (
                    <p className="mt-2 text-sm text-red-600">{errors.id_number.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-500">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    id="email"
                    type="text"
                    value={emailValue.replace(EMAIL_SUFFIX, '')}
                    onChange={handleEmailChange}
                    placeholder="your email"
                    className="block w-full rounded-l-md p-1 text-gray-700 border border-gray-300 border-r-0 focus:border-red-800 focus:ring-red-800"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-100 text-gray-500 text-sm select-none">
                    {EMAIL_SUFFIX}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Your email will always end with <span className="font-mono">{EMAIL_SUFFIX}</span></p>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                )}
                <input
                  type="hidden"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: new RegExp(`^[^@\\s]+${EMAIL_SUFFIX.replace('.', '\\.')}$`),
                      message: `Email must end with ${EMAIL_SUFFIX}`,
                    },
                  })}
                  value={emailValue}
                  readOnly
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lastname" className="block text-sm font-medium text-gray-500">
                    Last name <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1">
                    <input
                      id="lastname"
                      type="text"
                      {...register('lastname', { required: 'Last name is required' })}
                      className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
                    />
                    {errors.lastname && (
                      <p className="mt-2 text-sm text-red-600">{errors.lastname.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="firstname" className="block text-sm font-medium text-gray-500">
                    First name <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1">
                    <input
                      id="firstname"
                      type="text"
                      {...register('firstname', { required: 'First name is required' })}
                      className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
                    />
                    {errors.firstname && (
                      <p className="mt-2 text-sm text-red-600">{errors.firstname.message}</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="middlename" className="block text-sm font-medium text-gray-500">
                  Middle name
                </label>
                <div className="mt-1">
                  <input
                    id="middlename"
                    type="text"
                    {...register('middlename')}
                    className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-500">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="username"
                    type="text"
                    {...register('username', { required: 'Username is required' })}
                    className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
                  />
                  {errors.username && (
                    <p className="mt-2 text-sm text-red-600">{errors.username.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-500">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                    })}
                    className="block w-full rounded-md text-gray-800 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M3.293 9.293a1 1 0 011.414 0L10 14.586l5.293-5.293a1 1 0 011.414 1.414l-6-6a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                  {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-500">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirm_password', {
                      required: 'Please confirm your password',
                      validate: (value) => value === password || 'Passwords do not match',
                    })}
                    className="block w-full rounded-md text-gray-800 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M3.293 9.293a1 1 0 011.414 0L10 14.586l5.293-5.293a1 1 0 011.414 1.414l-6-6a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                  {errors.confirm_password && <p className="mt-2 text-sm text-red-600">{errors.confirm_password.message}</p>}
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex justify-center rounded-md border border-transparent bg-red-800 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-75"
                >
                  {isLoading ? 'Submitting...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}