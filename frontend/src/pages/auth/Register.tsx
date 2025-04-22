import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import axios, { AxiosError } from 'axios';
import Link from 'next/link';
import ZKPService from '../../services/zkpService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RegisterFormData {
  student_id: string;
  student_email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  college_id: string;
  password: string;
  confirmPassword: string;
}

interface College {
  college_id: number;
  name: string;
}
interface ErrorResponse {
  message?: string;
  errors?: Record<string, string>;
}

export default function Register() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [isLoadingColleges, setIsLoadingColleges] = useState<boolean>(true);
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterFormData>();
  const password = watch('password');
  
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        setIsLoadingColleges(true);
        const fullUrl = `${API_URL}/colleges`;
        console.log('Attempting to fetch colleges from:', fullUrl);
        
        // Add a small delay to ensure the backend is ready
        const response = await axios.get(fullUrl);
        
        console.log('Colleges response:', response.data);
        setColleges(response.data);
      } catch (err) {
        console.error('Failed to fetch colleges:', err);
        setError('Failed to load colleges. Please try again later.');
      } finally {
        setIsLoadingColleges(false);
      }
    };
    
    fetchColleges();
  }, []);
  
  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError('');
      setIsLoading(true);
      
      // Use ZKP service to generate secure credentials
      const passwordHash = ZKPService.hashCredentials(data.student_id, data.password);
      const zkpCommitment = ZKPService.generateCommitment(data.student_id, data.password);
      
      // Send registration request
      await axios.post(`${API_URL}/auth/register`, {
        student_id: data.student_id,
        student_email: data.student_email,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        college_id: Number(data.college_id),
        password_hash: passwordHash,
        zkp_commitment: zkpCommitment
      });
      
      // Registration success - redirect to login
      router.push('/auth/login?registered=true');
      
    } catch (err: unknown) {
      console.error('Registration error:', err);
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ErrorResponse>;
        if (axiosError.response?.data?.errors) {
          // Handle validation errors
          const validationErrors = Object.values(axiosError.response.data.errors).join(', ');
          setError(validationErrors);
        } else {
          setError(axiosError.response?.data?.message || axiosError.message || 'Registration failed');
        }
      } else {
        setError('Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Register for Voting System
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Create your secure voting account
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
              <label htmlFor="student_email" className="block text-sm font-medium text-gray-700">
                Student Email
              </label>
              <div className="mt-1">
                <input
                  id="student_email"
                  type="email"
                  autoComplete="email"
                  {...register('student_email', {
                    required: 'Student email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.student_email && (
                  <p className="mt-2 text-sm text-red-600">{errors.student_email.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <div className="mt-1">
                  <input
                    id="firstName"
                    type="text"
                    {...register('firstName', { required: 'First name is required' })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.firstName && (
                    <p className="mt-2 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <div className="mt-1">
                  <input
                    id="lastName"
                    type="text"
                    {...register('lastName', { required: 'Last name is required' })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.lastName && (
                    <p className="mt-2 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">
                Middle Name (Optional)
              </label>
              <div className="mt-1">
                <input
                  id="middleName"
                  type="text"
                  {...register('middleName')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="college_id" className="block text-sm font-medium text-gray-700">
                College
              </label>
              <div className="mt-1">
                <select
                  id="college_id"
                  {...register('college_id', { required: 'College is required' })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoadingColleges}
                >
                  <option value="">Select College</option>
                  {colleges.map(college => (
                    <option key={college.college_id} value={college.college_id}>
                      {college.name}
                    </option>
                  ))}
                </select>
                {errors.college_id && (
                  <p className="mt-2 text-sm text-red-600">{errors.college_id.message}</p>
                )}
                {isLoadingColleges && (
                  <p className="mt-2 text-sm text-gray-500">Loading colleges...</p>
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
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    }
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-75"
              >
                {isLoading ? 'Registering...' : 'Register'}
              </button>
            </div>
          </form>
          
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              <Link href="/auth/Login">
                <button
                  className="flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}