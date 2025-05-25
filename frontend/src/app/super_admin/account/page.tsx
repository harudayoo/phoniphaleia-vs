'use client';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import { useState, useEffect } from 'react';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface ProfileFormData {
  firstname: string;
  middlename?: string;
  lastname: string;
  email: string;
  username: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export default function AccountSettingsPage() {
  const { superAdmin } = useSuperAdmin();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const { 
    register: registerProfile, 
    handleSubmit: handleProfileSubmit, 
    reset: resetProfile,
    formState: { errors: profileErrors }
  } = useForm<ProfileFormData>();

  const { 
    register: registerPassword, 
    handleSubmit: handlePasswordSubmit, 
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors }
  } = useForm<PasswordFormData>();

  const newPassword = watchPassword('new_password');

  // Reset profile form when superAdmin data is loaded
  useEffect(() => {
    if (superAdmin) {
      resetProfile({
        firstname: superAdmin.full_name.split(' ')[0],
        middlename: superAdmin.full_name.split(' ').length > 2 ? superAdmin.full_name.split(' ')[1] : '',
        lastname: superAdmin.full_name.split(' ').length > 2 
          ? superAdmin.full_name.split(' ')[2] 
          : superAdmin.full_name.split(' ')[1],
        email: superAdmin.email,
        username: superAdmin.username
      });
    }
  }, [superAdmin, resetProfile]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    setProfileError(null);
    setProfileSuccess(null);
    setProfileSubmitting(true);
    
    try {
      const token = localStorage.getItem('super_admin_token');
      
      const response = await fetch(`${API_URL}/super_admin/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        setProfileSuccess('Profile updated successfully');
        // Force refresh the page to update the context
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const errorData = await response.json();
        setProfileError(errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileError('An error occurred while updating your profile');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setPasswordError(null);
    setPasswordSuccess(null);
    setPasswordSubmitting(true);
    
    try {
      const token = localStorage.getItem('super_admin_token');
      
      const response = await fetch(`${API_URL}/super_admin/change_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: data.current_password,
          new_password: data.new_password
        })
      });
      
      if (response.ok) {
        setPasswordSuccess('Password changed successfully');
        resetPassword({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } else {
        const errorData = await response.json();
        setPasswordError(errorData.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('An error occurred while changing your password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Account Settings</h1>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-red-700 text-red-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'password'
                    ? 'border-red-700 text-red-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Password
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-medium text-gray-800 mb-4">Profile Information</h2>
                
                {profileSuccess && (
                  <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-800 flex items-center">
                    <Check className="h-5 w-5 mr-2" />
                    {profileSuccess}
                  </div>
                )}
                
                {profileError && (
                  <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    {profileError}
                  </div>
                )}
                
                <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstname" className="block text-sm font-medium text-gray-700">
                        First Name
                      </label>
                      <input
                        id="firstname"
                        type="text"
                        {...registerProfile('firstname', { required: 'First name is required' })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                      {profileErrors.firstname && (
                        <p className="mt-1 text-sm text-red-600">{profileErrors.firstname.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="middlename" className="block text-sm font-medium text-gray-700">
                        Middle Name (Optional)
                      </label>
                      <input
                        id="middlename"
                        type="text"
                        {...registerProfile('middlename')}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lastname" className="block text-sm font-medium text-gray-700">
                        Last Name
                      </label>
                      <input
                        id="lastname"
                        type="text"
                        {...registerProfile('lastname', { required: 'Last name is required' })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                      {profileErrors.lastname && (
                        <p className="mt-1 text-sm text-red-600">{profileErrors.lastname.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        {...registerProfile('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address'
                          }
                        })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                      {profileErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{profileErrors.email.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Username
                      </label>
                      <input
                        id="username"
                        type="text"
                        {...registerProfile('username', { required: 'Username is required' })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                      {profileErrors.username && (
                        <p className="mt-1 text-sm text-red-600">{profileErrors.username.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={profileSubmitting}
                      className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      {profileSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'password' && (
              <div>
                <h2 className="text-lg font-medium text-gray-800 mb-4">Change Password</h2>
                
                {passwordSuccess && (
                  <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-800 flex items-center">
                    <Check className="h-5 w-5 mr-2" />
                    {passwordSuccess}
                  </div>
                )}
                
                {passwordError && (
                  <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    {passwordError}
                  </div>
                )}
                
                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                  <div>
                    <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                      Current Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="current_password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        {...registerPassword('current_password', { required: 'Current password is required' })}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.current_password && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.current_password.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="new_password"
                        type={showNewPassword ? 'text' : 'password'}
                        {...registerPassword('new_password', {
                          required: 'New password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters'
                          }
                        })}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.new_password && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.new_password.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="confirm_password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...registerPassword('confirm_password', {
                          required: 'Please confirm your password',
                          validate: value => value === newPassword || 'Passwords do not match'
                        })}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-red-500 focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.confirm_password && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.confirm_password.message}</p>
                    )}
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={passwordSubmitting}
                      className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      {passwordSubmitting ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
