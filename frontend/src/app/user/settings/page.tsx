'use client';
import { useEffect, useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import { Bell, Lock, User, Mail, AlertTriangle, Save } from 'lucide-react';

interface UserSettings {
  notifications: {
    email_notifications: boolean;
    election_reminders: boolean;
    result_notifications: boolean;
  };
  privacy: {
    show_participation: boolean;
  };
}

export default function UserSettingsPage() {
  const { user, loading: userLoading } = useUser();
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email_notifications: true,
      election_reminders: true,
      result_notifications: true
    },
    privacy: {
      show_participation: false
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  
  // Fetch user settings
  useEffect(() => {
    // This would be replaced with an actual API call
    // Example: fetch(`${API_URL}/user/settings`)
    
    // Simulate API delay
    setTimeout(() => {
      setLoading(false);
    }, 800);
  }, []);
  
  const handleNotificationChange = (setting: keyof typeof settings.notifications) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [setting]: !settings.notifications[setting]
      }
    });
  };
  
  const handlePrivacyChange = (setting: keyof typeof settings.privacy) => {
    setSettings({
      ...settings,
      privacy: {
        ...settings.privacy,
        [setting]: !settings.privacy[setting]
      }
    });
  };
  
  const saveSettings = async () => {
    setSuccessMessage('');
    setSaving(true);
    
    // This would be replaced with an actual API call
    // Example: await fetch(`${API_URL}/user/settings`, { method: 'POST', body: JSON.stringify(settings) })
    
    // Simulate API delay
    setTimeout(() => {
      setSaving(false);
      setSuccessMessage('Settings saved successfully!');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }, 800);
  };
  
  const changePassword = async () => {
    setPasswordError('');
    
    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    
    setSaving(true);
    
    // This would be replaced with an actual API call
    // Example: await fetch(`${API_URL}/user/change-password`, { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })
    
    // Simulate API delay and response
    setTimeout(() => {
      setSaving(false);
      
      // Reset fields and show success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Password changed successfully!');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }, 800);
  };

  return (
    <UserLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account preferences and information.
        </p>
      </div>
      
      {/* Settings tabs */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-3 font-medium text-sm ${
              activeTab === 'profile' 
                ? 'text-red-800 border-b-2 border-red-800' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <User size={16} className="inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-5 py-3 font-medium text-sm ${
              activeTab === 'security' 
                ? 'text-red-800 border-b-2 border-red-800' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Lock size={16} className="inline mr-2" />
            Security
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-5 py-3 font-medium text-sm ${
              activeTab === 'notifications' 
                ? 'text-red-800 border-b-2 border-red-800' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Bell size={16} className="inline mr-2" />
            Notifications
          </button>
        </div>

        <div className="p-6">
          {/* Success message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 text-green-800 p-4 rounded-lg">
              {successMessage}
            </div>
          )}
          
          {loading || userLoading ? (
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-3">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-800">Personal Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="student_id" className="block text-sm font-medium text-gray-700 mb-1">
                        Student ID
                      </label>
                      <input
                        type="text"
                        id="student_id"
                        value={user?.student_id || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">Student ID cannot be changed</p>
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 border border-r-0 border-gray-300 rounded-l-md">
                          <Mail size={16} />
                        </span>
                        <input
                          type="email"
                          id="email"
                          value={user?.student_email || ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-r-md bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Contact admin to update your email</p>
                    </div>
                    
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        id="first_name"
                        value={user?.first_name || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="last_name"
                        value={user?.last_name || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-800">Important Note</h3>
                      <p className="text-sm text-blue-700">
                        Your profile information is synchronized with the university&apos;s records. 
                        To update personal information, please contact the registrar&apos;s office.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-800">Change Password</h2>
                  
                  {passwordError && (
                    <div className="bg-red-50 text-red-800 p-4 rounded-lg">
                      {passwordError}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        id="current_password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Enter your current password"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        id="new_password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Enter new password"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Password must be at least 8 characters long and include a mix of letters, numbers, and symbols.
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        id="confirm_password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Confirm new password"
                      />
                    </div>
                    
                    <button
                      onClick={changePassword}
                      disabled={saving}
                      className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {saving ? 'Updating...' : 'Change Password'}
                    </button>
                  </div>
                  
                  <hr className="my-6" />
                  
                  <h2 className="text-lg font-medium text-gray-800">Privacy Settings</h2>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.privacy.show_participation}
                        onChange={() => handlePrivacyChange('show_participation')}
                        className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                      <span className="ml-2 text-gray-700">
                        Allow others to see which elections I have participated in
                      </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500 ml-6">
                      Others will only see that you participated, not how you voted.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-800">Notification Preferences</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.email_notifications}
                          onChange={() => handleNotificationChange('email_notifications')}
                          className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                        />
                        <span className="ml-2 text-gray-700">Email Notifications</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 ml-6">
                        Receive important system notifications via email
                      </p>
                    </div>
                    
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.election_reminders}
                          onChange={() => handleNotificationChange('election_reminders')}
                          className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                        />
                        <span className="ml-2 text-gray-700">Election Reminders</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 ml-6">
                        Get reminded about upcoming elections and when they are about to end
                      </p>
                    </div>
                    
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.result_notifications}
                          onChange={() => handleNotificationChange('result_notifications')}
                          className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                        />
                        <span className="ml-2 text-gray-700">Election Results</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 ml-6">
                        Be notified when results are published for elections you participated in
                      </p>
                    </div>
                    
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 disabled:opacity-70"
                    >
                      <Save size={16} />
                      {saving ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </UserLayout>
  );
}