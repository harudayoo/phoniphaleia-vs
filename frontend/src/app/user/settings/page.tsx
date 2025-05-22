'use client';
import { useEffect, useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import { Bell, Lock, User, Mail, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import apiClient from '@/utils/apiClient';
import Modal from '@/components/Modal';

interface UserSettings {
  notifications: {
    email_notifications: boolean;
    election_reminders: boolean;
    result_notifications: boolean;
  };
}

function isAxiosError(err: unknown): err is { response?: { data?: { message?: string } } } {
  return typeof err === 'object' && err !== null && 'response' in err;
}

export default function UserSettingsPage() {
  const { user, loading: userLoading } = useUser();
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email_notifications: true,
      election_reminders: true,
      result_notifications: true
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
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch user settings from backend
  useEffect(() => {
    setLoading(true);
    apiClient.get('/user/settings')
      .then(res => {
        if (res.data && res.data.notifications) {
          setSettings({ notifications: res.data.notifications });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleNotificationChange = (setting: keyof typeof settings.notifications) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [setting]: !prev.notifications[setting]
      }
    }));
  };

  const saveSettings = async () => {
    setSuccessMessage('');
    setSaving(true);
    try {
      await apiClient.post('/user/settings', settings);
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      let errorMsg = 'Failed to save settings';
      if (isAxiosError(err) && err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      setSuccessMessage(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPasswordError('');
    setSuccessMessage('');
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
    try {
      await apiClient.post(
        '/user/change-password',
        {
          current_password: currentPassword,
          new_password: newPassword
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('voter_token') || ''}`
          }
        }
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Password changed successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      let errorMsg = 'Failed to change password';
      if (isAxiosError(err) && err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      setPasswordError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Photo upload logic
  const handlePhotoButtonClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        setPhotoFile(target.files[0]);
        setPhotoError('');
        setPhotoSuccess('');
        setPhotoModalOpen(true);
      }
    };
    input.click();
  };

  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) {
      setPhotoError('Please select a photo.');
      return;
    }
    setPhotoUploading(true);
    setPhotoError('');
    setPhotoSuccess('');
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      await apiClient.post('/user/update-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('voter_token') || ''}`
        }
      });
      setPhotoSuccess('Photo updated successfully!');
      setTimeout(() => {
        setPhotoModalOpen(false);
        setPhotoFile(null);
        window.location.reload();
      }, 900);
    } catch (err: unknown) {
      let errorMsg = 'Failed to update photo';
      if (isAxiosError(err) && err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      setPhotoError(errorMsg);
    } finally {
      setPhotoUploading(false);
    }
  };

  return (
    <UserLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account preferences and information.
        </p>
      </div>
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-3 font-medium text-sm ${activeTab === 'profile' ? 'text-red-800 border-b-2 border-red-800' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <User size={16} className="inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-5 py-3 font-medium text-sm ${activeTab === 'security' ? 'text-red-800 border-b-2 border-red-800' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <Lock size={16} className="inline mr-2" />
            Security
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-5 py-3 font-medium text-sm ${activeTab === 'notifications' ? 'text-red-800 border-b-2 border-red-800' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <Bell size={16} className="inline mr-2" />
            Notifications
          </button>
        </div>
        <div className="p-6">
          {successMessage && (
            <div className="mb-6 bg-green-50 text-green-800 p-4 rounded-lg">{successMessage}</div>
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
                      <label htmlFor="student_id" className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                      <input type="text" id="student_id" value={user?.student_id || ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed" />
                      <p className="mt-1 text-xs text-gray-500">Student ID cannot be changed</p>
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 border border-r-0 border-gray-300 rounded-l-md"><Mail size={16} /></span>
                        <input type="email" id="email" value={user?.student_email || ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded-r-md bg-gray-100 text-gray-600 cursor-not-allowed" />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Contact admin to update your email</p>
                    </div>
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input type="text" id="first_name" value={user?.first_name || ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed" />
                    </div>
                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input type="text" id="last_name" value={user?.last_name || ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed" />
                    </div>
                  </div>
                  {/* Update Photo Button */}
                  <div>
                    <button type="button" onClick={handlePhotoButtonClick} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Update Photo</button>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-800">Important Note</h3>
                      <p className="text-sm text-blue-700">Your profile information is synchronized with the university&apos;s records. To update personal information, please contact the registrar&apos;s office.</p>
                    </div>
                  </div>
                </div>
              )}
              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-800">Change Password</h2>
                  {passwordError && (
                    <div className="bg-red-50 text-red-800 p-4 rounded-lg">{passwordError}</div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md pr-10"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          autoComplete="current-password"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          tabIndex={-1}
                          onClick={() => setShowCurrentPassword(v => !v)}
                        >
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md pr-10"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          autoComplete="new-password"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          tabIndex={-1}
                          onClick={() => setShowNewPassword(v => !v)}
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md pr-10"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          tabIndex={-1}
                          onClick={() => setShowConfirmPassword(v => !v)}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <button onClick={changePassword} className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition" disabled={saving}>Change Password</button>
                  </div>
                  <hr className="my-6" />
                </div>
              )}
              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-800">Notification Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="email_notifications" checked={settings.notifications.email_notifications} onChange={() => handleNotificationChange('email_notifications')} className="h-4 w-4 text-red-600 border-gray-300 rounded" />
                      <label htmlFor="email_notifications" className="text-gray-700">Receive email notifications</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="election_reminders" checked={settings.notifications.election_reminders} onChange={() => handleNotificationChange('election_reminders')} className="h-4 w-4 text-red-600 border-gray-300 rounded" />
                      <label htmlFor="election_reminders" className="text-gray-700">Election reminders</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="result_notifications" checked={settings.notifications.result_notifications} onChange={() => handleNotificationChange('result_notifications')} className="h-4 w-4 text-red-600 border-gray-300 rounded" />
                      <label htmlFor="result_notifications" className="text-gray-700">Result notifications</label>
                    </div>
                  </div>
                  <button onClick={saveSettings} className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition" disabled={saving}>Save Preferences</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Update Photo Modal */}
      <Modal isOpen={photoModalOpen} onClose={() => { setPhotoModalOpen(false); setPhotoFile(null); }} title="Update Photo" size="sm">
        <form onSubmit={handlePhotoUpload} className="space-y-4">
          {photoFile && (
            <div className="flex flex-col items-center gap-3">
              <img
                src={URL.createObjectURL(photoFile)}
                alt="Preview"
                className="max-h-48 max-w-full rounded-full shadow border-2 border-blue-200 object-cover"
                style={{ width: 128, height: 128 }}
              />
              <span className="text-gray-500 text-xs">Preview</span>
            </div>
          )}
          {photoSuccess && (
            <div className="flex flex-col items-center gap-2">
              <div className="bg-green-100 rounded-full p-2"><svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
              <div className="text-green-700 text-sm font-medium">{photoSuccess}</div>
            </div>
          )}
          {photoError && <div className="text-red-600 text-sm text-center">{photoError}</div>}
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => { setPhotoModalOpen(false); setPhotoFile(null); }} disabled={photoUploading}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow" disabled={photoUploading || !photoFile}>{photoUploading ? 'Uploading...' : 'Update Photo'}</button>
          </div>
        </form>
      </Modal>
    </UserLayout>
  );
}