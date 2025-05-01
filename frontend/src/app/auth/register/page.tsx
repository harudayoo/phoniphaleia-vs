"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RegisterFormData {
  // General Details
  first_name: string;
  last_name: string;
  middle_name?: string;
  gender: string;
  date_of_birth: string;
  address_field: string;
  
  // Academic Details
  student_id: string;
  student_email: string;
  status: string;
  college_id: string;
  program: string;
  major: string;
  photo?: string; // This will store the photo filename or URL returned from the backend/local storage
  // Confirm Details
  password: string;
  confirm_password: string;
}

interface College {
  college_id: number;
  name: string;
}

export default function Register() {
    const router = useRouter();
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [colleges, setColleges] = useState<College[]>([]);
    const [isLoadingColleges, setIsLoadingColleges] = useState<boolean>(true);
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [idPicture, setIdPicture] = useState<File | null>(null);
    const [showPassword, setShowPassword] = useState<boolean>(false); // State for toggling password visibility
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false); // State for toggling confirm password visibility
  
    const { 
      register, 
      handleSubmit, 
      formState: { errors }, 
      watch, 
      getValues,
      trigger,
      setValue,
    } = useForm<RegisterFormData>({
      mode: 'onChange',
      shouldUnregister: false,
      defaultValues: {
        first_name: '',
        last_name: '',
        middle_name: '',
        gender: '',
        date_of_birth: '',
        address_field: '',
        student_id: '',
        student_email: '',
        status: '',
        college_id: '',
        program: '',
        major: '',
        password: '',
        confirm_password: ''
      }
    });
  
    const password = watch('password');
  
    useEffect(() => {
        return () => {
          const currentValues = getValues();
          setValue('address_field', currentValues.address_field);
          setValue('program', currentValues.program);
        };
      }, [currentStep, getValues, setValue]);
  
    useEffect(() => {
      const fetchColleges = async () => {
        try {
          setIsLoadingColleges(true);
          const fullUrl = `${API_URL}/colleges`;
          console.log('Attempting to fetch colleges from:', fullUrl);
          
          const response = await axios.get<College[]>(fullUrl);
          
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
      if (!data.student_id || !data.student_email || !data.password) {
        setError('Please fill in all required fields.');
        return;
      }
    
      try {
        setError('');
        setIsLoading(true);
    
        const formData = new FormData();
        formData.append('student_id', data.student_id);
        formData.append('student_email', `${data.student_email}@usep.edu.ph`);
        formData.append('password', data.password);
        formData.append('first_name', data.first_name);
        formData.append('last_name', data.last_name);
        formData.append('middle_name', data.middle_name || '');
        formData.append('gender', data.gender);
        formData.append('date_of_birth', data.date_of_birth);
        formData.append('address_field', data.address_field);
        formData.append('status', data.status);
        formData.append('college_id', data.college_id);
        formData.append('program', data.program);
        formData.append('major', data.major);
    
        if (idPicture) {
          formData.append('photo', idPicture);
        }
    
        const response = await axios.post(`${API_URL}/auth/register`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
    
        console.log('Registration successful:', response.data);
        router.push('/auth/login?registered=true');
      } catch (err: unknown) {
        console.error('Registration error:', err);
        if (axios.isAxiosError(err)) {
          console.error('Backend error:', err.response?.data);
          setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } else {
          setError('Registration failed. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    const nextStep = async () => {
      const fieldsToValidate = currentStep === 1
        ? ['first_name', 'last_name', 'gender', 'date_of_birth', 'address_field']
        : ['student_id', 'student_email', 'status', 'college_id', 'program', 'major'];

      const isValid = await trigger(fieldsToValidate as Array<keyof RegisterFormData>);

      if (!isValid) {
        setError('Input required fields before proceeding');
        return;
      }

      if (currentStep === 2 && !idPicture) {
        setError('Please upload your ID photo before proceeding');
        return;
      }

      setError('');
      setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
      setCurrentStep(currentStep - 1);
    };

    const registerAddressField = register('address_field', { 
      required: 'Address is required' 
    });

    const registerProgramField = register('program', { 
      required: 'Program is required' 
    });

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];

        if (file.size > 5 * 1024 * 1024) {
          setError('File size exceeds the 5MB limit.');
          return;
        }

        if (!['image/png', 'image/jpeg'].includes(file.type)) {
          setError('Invalid file type. Only PNG and JPEG are allowed.');
          return;
        }

        setIdPicture(file);
        setError(''); // Clear any previous errors
      }
    };

    const renderPhotoPreview = () => (
      idPicture && (
          <div className="mt-4">
              <p className="text-sm text-gray-600">Preview:</p>
              <img
                  src={URL.createObjectURL(idPicture)}
                  alt="ID Preview"
                  className="w-32 h-32 object-cover rounded-md border"
              />
          </div>
      )
    );

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

    const renderGeneralDetails = () => (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-500">
                First name <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="first_name"
                  type="text"
                  {...register('first_name', { required: 'First name is required' })}
                  className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
                />
                {errors.first_name && (
                  <p className="mt-2 text-sm text-red-600">{errors.first_name.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="middle_name" className="block text-sm font-medium text-gray-500">
                Middle name
              </label>
              <div className="mt-1">
                <input
                  id="middle_name"
                  type="text"
                  {...register('middle_name')}
                  className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-500">
              Last name <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <input
                id="last_name"
                type="text"
                {...register('last_name', { required: 'Last name is required' })}
                className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
              />
              {errors.last_name && (
                <p className="mt-2 text-sm text-red-600">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-500">
              Gender <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <select
                id="gender"
                {...register('gender', { required: 'Gender is required' })}
                className="block w-full rounded-md p-1 text-gray-700 border-gray-500 shadow-sm focus:border-red-800 focus:ring-red-800"
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
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-500">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <input
                id="date_of_birth"
                type="date"
                {...register('date_of_birth', { required: 'Date of birth is required' })}
                className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
              />
              {errors.date_of_birth && (
                <p className="mt-2 text-sm text-red-600">{errors.date_of_birth.message}</p>
              )}
            </div> 
          </div>

          <div>
          <label htmlFor="address_field" className="block text-sm font-medium text-gray-500">
            Address <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <input
              id="address_field"
              type="text"
              {...registerAddressField}
              className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
            />
            {errors.address_field && (
              <p className="mt-2 text-sm text-red-600">{errors.address_field.message}</p>
            )}
          </div>
        </div>

        </>
      );

    const renderAcademicDetails = () => (
        <>
          <div>
            <label htmlFor="student_id" className="block text-sm font-medium text-gray-500">
              Student ID Number <span className="text-red-500">*</span>
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
                className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
              />
              {errors.student_id && (
                <p className="mt-2 text-sm text-red-600">{errors.student_id.message}</p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-4">
            <div className="flex-1">
              <label htmlFor="student_email" className="block text-sm font-medium text-gray-500">
                Email Address <span className="text-red-500">*</span>
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
                  className="block w-full rounded-l-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
                />
                <span className="inline-flex items-center p-1 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500">
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
              Status <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <select
                id="status"
                {...register('status', { required: 'Status is required' })}
                className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
              >
                <option value="">Select Status</option>
                <option value="Enrolled">Currently Enrolled</option>
                <option value="Unenrolled">Not Enrolled</option>
                <option value="Alumni">Alumni</option>
              </select>
              {errors.status && (
                <p className="mt-2 text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>
          </div>
          
          <div>
          <label htmlFor="college_id" className="block text-sm font-medium text-gray-500">
            College <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <select
              id="college_id"
              {...register('college_id', { 
                required: 'College is required'
              })}
              className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
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
          </div>
        </div>

        <div>
          <label htmlFor="program" className="block text-sm font-medium text-gray-500">
            Program <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <input
              id="program"
              type="text"
              {...registerProgramField}
              className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
            />
            {errors.program && (
              <p className="mt-2 text-sm text-red-600">{errors.program.message}</p>
            )}
          </div>
        </div>

          <div>
            <label htmlFor="major" className="block text-sm font-medium text-gray-500">
              Major <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <input
                id="major"
                type="text"
                {...register('major', { required: 'Major is required' })}
                className="block w-full rounded-md p-1 text-gray-700 border-gray-300 shadow-sm focus:border-red-800 focus:ring-red-800"
              />
              {errors.major && (
                <p className="mt-2 text-sm text-red-600">{errors.major.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="idPhoto" className="block text-sm font-medium text-gray-500">
              ID Photo <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <input
                id="idPhoto"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-red-50 file:text-red-700
                  hover:file:bg-red-100"
                required
              />
              {idPicture && (
                <p className="mt-2 text-sm text-green-600">
                  Photo selected: {idPicture.name}
                </p>
              )}
              {!idPicture && (
                <p className="mt-2 text-sm text-gray-500">
                  Please upload a clear photo of your ID
                </p>
              )}
              {renderPhotoPreview()}
            </div>
          </div>

          </>
      );

    const renderConfirmDetails = () => {
        const formValues = getValues();

        return (
            <>
                <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Details Entered</h3>
                    <div className="bg-gray-50 rounded-md p-4 mb-4">
                        <div className="space-y-2 text-gray-500">
                            <p><strong>Name:</strong> {formValues.first_name} {formValues.middle_name ? formValues.middle_name + ' ' : ''}{formValues.last_name}</p>
                            <p><strong>Gender:</strong> {formValues.gender}</p>
                            <p><strong>Date of Birth:</strong> {formValues.date_of_birth}</p>
                            <p><strong>Address:</strong> {formValues.address_field}</p>
                            <p><strong>Student ID:</strong> {formValues.student_id}</p>
                            <p><strong>Email:</strong> {formValues.student_email}@usep.edu.ph</p>
                            <p><strong>Status:</strong> {formValues.status}</p>
                            <p><strong>College:</strong> {colleges.find(c => c.college_id.toString() === formValues.college_id)?.name || formValues.college_id}</p>
                            <p><strong>Program:</strong> {formValues.program}</p>
                            <p><strong>Major:</strong> {formValues.major}</p>
                            <p><strong>ID Photo:</strong> {idPicture ? 'Photo uploaded' : 'No photo uploaded'}</p>
                        </div>
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
                                        d="M3.293 9.293a1 1 0 011.414 0L10 14.586l5.293-5.293a1 1 0 011.414 1.414l-6 6a1 1 0 010-1.414z"
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
            </>
        );
    };

    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
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
                {currentStep === 1 && renderGeneralDetails()}
                {currentStep === 2 && renderAcademicDetails()}
                {currentStep === 3 && renderConfirmDetails()}

                <div className="mt-8 flex justify-between">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Back
                    </button>
                  )}
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex justify-center rounded-md border border-transparent bg-red-800 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex justify-center rounded-md border border-transparent bg-red-800 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-75"
                    >
                      {isLoading ? 'Submitting...' : 'Submit'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
}
