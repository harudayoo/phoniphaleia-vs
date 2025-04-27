"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import Link from 'next/link';
import ZKPService from '@/services/zkpservice';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RegisterFormData {
  // General Details
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  
  // Academic Details
  student_id: string;
  student_email: string;
  status: string;
  college_id: string;
  program: string;
  major: string;
  
  // Confirm Details
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
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  const { register, handleSubmit, formState: { errors }, watch, getValues } = useForm<RegisterFormData>();
  const password = watch('password');
  
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        setIsLoadingColleges(true);
        const fullUrl = `${API_URL}/colleges`;
        console.log('Attempting to fetch colleges from:', fullUrl);
        
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
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        status: data.status,
        college_id: Number(data.college_id),
        program: data.program,
        major: data.major,
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

  const nextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center mb-8">
        <div className={`flex items-center ${currentStep === 1 ? 'text-red-800 font-bold' : 'text-gray-500'}`}>
          <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-current">
            1
          </div>
          <span className="ml-2">General Details</span>
        </div>
        <div className="w-12 h-1 mx-4 bg-gray-300"></div>
        <div className={`flex items-center ${currentStep === 2 ? 'text-red-800 font-bold' : 'text-gray-500'}`}>
          <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-current">
            2
          </div>
          <span className="ml-2">Academic Details</span>
        </div>
        <div className="w-12 h-1 mx-4 bg-gray-300"></div>
        <div className={`flex items-center ${currentStep === 3 ? 'text-red-800 font-bold' : 'text-gray-500'}`}>
          <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-current">
            3
          </div>
          <span className="ml-2">Confirm Details</span>
        </div>
      </div>
    );
  };

  const generalDetailsContent = () => {
    return (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-500">
              First name*
            </label>
            <div className="mt-1">
              <input
                id="firstName"
                type="text"
                {...register('firstName', { required: 'First name is required' })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
              />
              {errors.firstName && (
                <p className="mt-2 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>
          </div>
          
          <div>
            <label htmlFor="middleName" className="block text-sm font-medium text-gray-500">
              Middle name
            </label>
            <div className="mt-1">
              <input
                id="middleName"
                type="text"
                {...register('middleName')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-500">
            Last name*
          </label>
          <div className="mt-1">
            <input
              id="lastName"
              type="text"
              {...register('lastName', { required: 'Last name is required' })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
            />
            {errors.lastName && (
              <p className="mt-2 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-500">
            Gender*
          </label>
          <div className="mt-1">
            <select
              id="gender"
              {...register('gender', { required: 'Gender is required' })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && (
              <p className="mt-2 text-sm text-red-600">{errors.gender.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-500">
            Date of Birth*
          </label>
          <div className="mt-1">
            <input
              id="dateOfBirth"
              type="date"
              {...register('dateOfBirth', { required: 'Date of birth is required' })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
            />
            {errors.dateOfBirth && (
              <p className="mt-2 text-sm text-red-600">{errors.dateOfBirth.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-500">
            Address*
          </label>
          <div className="mt-1">
            <input
              id="address"
              type="text"
              {...register('address', { required: 'Address is required' })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
            />
            {errors.address && (
              <p className="mt-2 text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={nextStep}
            className="flex justify-center rounded-md border border-transparent bg-red-800 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Next
          </button>
        </div>
      </>
    );
  };

  const academicDetailsContent = () => {
    return (
      <>
        <div>
          <label htmlFor="student_id" className="block text-sm font-medium text-gray-500">
            Student ID Number*
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
            />
            {errors.student_id && (
              <p className="mt-2 text-sm text-red-600">{errors.student_id.message}</p>
            )}
          </div>
        </div>
        
        <div className="flex space-x-4">
          <div className="flex-1">
            <label htmlFor="student_email" className="block text-sm font-medium text-gray-500">
              Email Address*
            </label>
            <div className="mt-1 flex">
              <input
                id="student_email"
                type="text"
                {...register('student_email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+$/i,
                    message: 'Invalid email username'
                  }
                })}
                className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
              />
              <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500">
                @usep.edu.ph
              </span>
            </div>
            {errors.student_email && (
              <p className="mt-2 text-sm text-red-600">{errors.student_email.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-500">
            Status*
          </label>
          <div className="mt-1">
            <select
              id="status"
              {...register('status', { required: 'Status is required' })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
            >
              <option value="">Select Status</option>
              <option value="regular">Regular</option>
              <option value="irregular">Irregular</option>
              <option value="transferee">Transferee</option>
            </select>
            {errors.status && (
              <p className="mt-2 text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="college_id" className="block text-sm font-medium text-gray-500">
            College*
          </label>
          <div className="mt-1">
            <select
              id="college_id"
              {...register('college_id', { required: 'College is required' })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
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
          <label htmlFor="program" className="block text-sm font-medium text-gray-500">
            Program*
          </label>
          <div className="mt-1">
            <input
              id="program"
              type="text"
              {...register('program', { required: 'Program is required' })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
            />
            {errors.program && (
              <p className="mt-2 text-sm text-red-600">{errors.program.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="major" className="block text-sm font-medium text-gray-500">
            Major*
          </label>
          <div className="mt-1">
            <input
              id="major"
              type="text"
              {...register('major', { required: 'Major is required' })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
            />
            {errors.major && (
              <p className="mt-2 text-sm text-red-600">{errors.major.message}</p>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            className="flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Back
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="flex justify-center rounded-md border border-transparent bg-red-800 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Next
          </button>
        </div>
      </>
    );
  };

  const confirmDetailsContent = () => {
    const formValues = getValues();
    
    return (
      <>
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Details Entered</h3>
          <div className="bg-gray-50 rounded-md p-4 mb-4">
            <div className="space-y-2 text-gray-500">
              <p><strong>Name:</strong> {formValues.firstName} {formValues.middleName ? formValues.middleName + ' ' : ''}{formValues.lastName}</p>
              <p><strong>Gender:</strong> {formValues.gender}</p>
              <p><strong>Date of Birth:</strong> {formValues.dateOfBirth}</p>
              <p><strong>Address:</strong> {formValues.address}</p>
              <p><strong>Student ID:</strong> {formValues.student_id}</p>
              <p><strong>Email:</strong> {formValues.student_email}@usep.edu.ph</p>
              <p><strong>Status:</strong> {formValues.status}</p>
              <p><strong>College:</strong> {colleges.find(c => c.college_id.toString() === formValues.college_id)?.name || formValues.college_id}</p>
              <p><strong>Program:</strong> {formValues.program}</p>
              <p><strong>Major:</strong> {formValues.major}</p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-500">
            Password*
          </label>
          <div className="mt-1 relative">
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-500">
            Confirm Password*
          </label>
          <div className="mt-1">
            <input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match'
              })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
            />
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            className="flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex justify-center rounded-md border border-transparent bg-red-800 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-75"
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </>
    );
  };

  const renderFormContent = () => {
    switch(currentStep) {
      case 1:
        return generalDetailsContent();
      case 2:
        return academicDetailsContent();
      case 3:
        return confirmDetailsContent();
      default:
        return generalDetailsContent();
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-red-800 text-white py-4 px-6 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
              X
            </div>
            <div>
              <div className="font-bold">One Data. One USeP.</div>
              <div className="text-sm">Phoniphaleia Online Voting System</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold">USeP Obrero</div>
            <div className="text-sm">Student COMELEC</div>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
            X
          </div>
        </div>
      </header>

      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <Link href="/auth/login" className="text-gray-500 hover:text-red-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <h2 className="text-xl font-bold text-center flex-grow text-red-800">Registration</h2>
            </div>
            <p className="text-center text-gray-600 mb-6">Create an account to cast your vote.</p>
            
            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}
            
            {renderStepIndicator()}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {renderFormContent()}
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-red-800 text-white py-4 px-6">
        <div className="container mx-auto">
          <div className="flex justify-center space-x-8">
            <div className="w-8 h-8 border border-white rounded flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>
            <div className="w-8 h-8 border border-white rounded flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="w-8 h-8 border border-white rounded flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-center text-sm mt-4">
            © 202X University of Southeastern Philippines. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}