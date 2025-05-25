'use client';
import AdminLayout from '@/layouts/AdminLayout';
import { useState, useEffect } from 'react';
import { 
  Globe, 
  Shield, 
  Bell, 
  Users, 
  Database, 
  Save,
  Check,
  AlertTriangle
} from 'lucide-react';

// Import reusable components
import PageHeader from '@/components/admin/PageHeader';
import systemSettingsService, { SystemSettings } from '@/services/systemSettingsService';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      systemName: '',
      contactEmail: '',
      supportPhone: '',
      maintenanceMode: false,
      copyrightText: '',
    },
    elections: {
      defaultDuration: 7,
      reminderHours: 24,
      resultDelay: 2,
      minimumCandidates: 2,
      requireConfirmation: true,
    },
    security: {
      sessionTimeout: 30,
      failedAttempts: 5,
      passwordExpiryDays: 90,
      mfaRequired: false,
      ipRestriction: false,
    },
    notifications: {
      emailNotifications: true,
      adminAlerts: true,
      resultNotifications: true,
      systemAlerts: true,
    },
    users: {
      autoApprove: false,
      allowSelfRegistration: true,
      inactivityDays: 180,
      maxAdminUsers: 5,
    },
    backup: {
      autoBackup: true,
      backupFrequency: 1,
      retentionDays: 30,
      includeAttachments: true,
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');  // Fetch settings from API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await systemSettingsService.getAllSettings();
        
        // Ensure all categories exist with fallback to defaults
        const mergedSettings: SystemSettings = {
          general: {
            systemName: data?.general?.systemName || '',
            contactEmail: data?.general?.contactEmail || '',
            supportPhone: data?.general?.supportPhone || '',
            maintenanceMode: data?.general?.maintenanceMode || false,
            copyrightText: data?.general?.copyrightText || '',
          },
          elections: {
            defaultDuration: data?.elections?.defaultDuration || 7,
            reminderHours: data?.elections?.reminderHours || 24,
            resultDelay: data?.elections?.resultDelay || 2,
            minimumCandidates: data?.elections?.minimumCandidates || 2,
            requireConfirmation: data?.elections?.requireConfirmation !== undefined ? data.elections.requireConfirmation : true,
          },
          security: {
            sessionTimeout: data?.security?.sessionTimeout || 30,
            failedAttempts: data?.security?.failedAttempts || 5,
            passwordExpiryDays: data?.security?.passwordExpiryDays || 90,
            mfaRequired: data?.security?.mfaRequired || false,
            ipRestriction: data?.security?.ipRestriction || false,
          },
          notifications: {
            emailNotifications: data?.notifications?.emailNotifications !== undefined ? data.notifications.emailNotifications : true,
            adminAlerts: data?.notifications?.adminAlerts !== undefined ? data.notifications.adminAlerts : true,
            resultNotifications: data?.notifications?.resultNotifications !== undefined ? data.notifications.resultNotifications : true,
            systemAlerts: data?.notifications?.systemAlerts !== undefined ? data.notifications.systemAlerts : true,
          },
          users: {
            autoApprove: data?.users?.autoApprove || false,
            allowSelfRegistration: data?.users?.allowSelfRegistration !== undefined ? data.users.allowSelfRegistration : true,
            inactivityDays: data?.users?.inactivityDays || 180,
            maxAdminUsers: data?.users?.maxAdminUsers || 5,
          },
          backup: {
            autoBackup: data?.backup?.autoBackup !== undefined ? data.backup.autoBackup : true,
            backupFrequency: data?.backup?.backupFrequency || 1,
            retentionDays: data?.backup?.retentionDays || 30,
            includeAttachments: data?.backup?.includeAttachments !== undefined ? data.backup.includeAttachments : true,
          }
        };
        
        setSettings(mergedSettings);
        console.log('Settings loaded successfully:', mergedSettings);
      } catch (error) {
        console.error('Error fetching settings:', error);
        setError('Failed to load settings. Using default values.');
        // Keep the default settings that were set in useState
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (section: keyof SystemSettings, field: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };
    const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      
      // Save settings via API
      await systemSettingsService.updateSettings(settings);
      
      setSaving(false);
      setSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      setSaving(false);
      setError(`Failed to save settings: ${err instanceof Error ? err.message : 'Please try again'}`);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: <Globe size={16} /> },
    { id: 'elections', name: 'Elections', icon: <Users size={16} /> },
    { id: 'security', name: 'Security', icon: <Shield size={16} /> },
    { id: 'notifications', name: 'Notifications', icon: <Bell size={16} /> },
    { id: 'users', name: 'Users', icon: <Users size={16} /> },
    { id: 'backup', name: 'Backup & Data', icon: <Database size={16} /> },
  ];

  // Create save button for header
  const saveButton = (
    <button 
      onClick={saveSettings}
      disabled={saving}
      className={`px-4 py-2 rounded-lg flex items-center gap-2 ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-800 hover:bg-red-700'} text-white`}
    >
      {saving ? 'Saving...' : (
        <>
          <Save size={16} /> Save Changes
        </>
      )}
    </button>
  );

  return (
    <AdminLayout>
      <PageHeader 
        title="System Settings" 
        description="Configure system-wide settings and preferences for the voting platform."
        action={saveButton}
      />

      {/* Success message */}
      {saveSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check size={16} />
          Settings saved successfully
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
        {/* Tabs */}
        <div className="border-b border-gray-200 px-4 flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-red-800 border-b-2 border-red-800'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-3">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : (
            <div>
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-800">General Settings</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        System Name
                      </label>
                      <input
                        type="text"
                        value={settings.general.systemName}
                        onChange={(e) => handleChange('general', 'systemName', e.target.value)}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={settings.general.contactEmail}
                        onChange={(e) => handleChange('general', 'contactEmail', e.target.value)}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Support Phone
                      </label>
                      <input
                        type="text"
                        value={settings.general.supportPhone}
                        onChange={(e) => handleChange('general', 'supportPhone', e.target.value)}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Copyright Text
                      </label>
                      <input
                        type="text"
                        value={settings.general.copyrightText}
                        onChange={(e) => handleChange('general', 'copyrightText', e.target.value)}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="maintenanceMode"
                      checked={settings.general.maintenanceMode}
                      onChange={(e) => handleChange('general', 'maintenanceMode', e.target.checked)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-700">
                      Enable Maintenance Mode
                    </label>
                  </div>

                  {settings.general.maintenanceMode && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Warning: Maintenance mode will make the system inaccessible to regular users
                    </div>
                  )}
                </div>
              )}

              {/* Election Settings */}
              {activeTab === 'elections' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-800">Election Settings</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Election Duration (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={settings.elections.defaultDuration}
                        onChange={(e) => handleChange('elections', 'defaultDuration', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reminder Hours Before End
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="72"
                        value={settings.elections.reminderHours}
                        onChange={(e) => handleChange('elections', 'reminderHours', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Result Publication Delay (hours)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="48"
                        value={settings.elections.resultDelay}
                        onChange={(e) => handleChange('elections', 'resultDelay', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Number of Candidates
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={settings.elections.minimumCandidates}
                        onChange={(e) => handleChange('elections', 'minimumCandidates', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requireConfirmation"
                      checked={settings.elections.requireConfirmation}
                      onChange={(e) => handleChange('elections', 'requireConfirmation', e.target.checked)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor="requireConfirmation" className="ml-2 block text-sm text-gray-700">
                      Require voter confirmation before submitting ballot
                    </label>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-800">Security Settings</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Session Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={settings.security.sessionTimeout}
                        onChange={(e) => handleChange('security', 'sessionTimeout', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Failed Login Attempts
                      </label>
                      <input
                        type="number"
                        min="3"
                        max="10"
                        value={settings.security.failedAttempts}
                        onChange={(e) => handleChange('security', 'failedAttempts', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password Expiry (days)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="365"
                        value={settings.security.passwordExpiryDays}
                        onChange={(e) => handleChange('security', 'passwordExpiryDays', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="mfaRequired"
                        checked={settings.security.mfaRequired}
                        onChange={(e) => handleChange('security', 'mfaRequired', e.target.checked)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="mfaRequired" className="ml-2 block text-sm text-gray-700">
                        Require Multi-factor Authentication for administrators
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="ipRestriction"
                        checked={settings.security.ipRestriction}
                        onChange={(e) => handleChange('security', 'ipRestriction', e.target.checked)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="ipRestriction" className="ml-2 block text-sm text-gray-700">
                        Enable IP restriction for admin access
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-800">Notification Settings</h2>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-800">Email Notifications</h3>
                        <p className="text-sm text-gray-600">Send email notifications to voters about elections</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.notifications.emailNotifications}
                          onChange={(e) => handleChange('notifications', 'emailNotifications', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-800">Admin Alerts</h3>
                        <p className="text-sm text-gray-600">Notify administrators about important events</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.notifications.adminAlerts}
                          onChange={(e) => handleChange('notifications', 'adminAlerts', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-800">Result Notifications</h3>
                        <p className="text-sm text-gray-600">Send notifications when election results are published</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.notifications.resultNotifications}
                          onChange={(e) => handleChange('notifications', 'resultNotifications', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-800">System Alerts</h3>
                        <p className="text-sm text-gray-600">Send alerts about system status and maintenance</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.notifications.systemAlerts}
                          onChange={(e) => handleChange('notifications', 'systemAlerts', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* User Settings */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-800">User Management Settings</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Admin Users
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={settings.users.maxAdminUsers}
                        onChange={(e) => handleChange('users', 'maxAdminUsers', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User Inactivity Threshold (days)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="365"
                        value={settings.users.inactivityDays}
                        onChange={(e) => handleChange('users', 'inactivityDays', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Users will be marked inactive after this many days without login
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="autoApprove"
                        checked={settings.users.autoApprove}
                        onChange={(e) => handleChange('users', 'autoApprove', e.target.checked)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="autoApprove" className="ml-2 block text-sm text-gray-700">
                        Automatically approve new voter registrations
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allowSelfRegistration"
                        checked={settings.users.allowSelfRegistration}
                        onChange={(e) => handleChange('users', 'allowSelfRegistration', e.target.checked)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="allowSelfRegistration" className="ml-2 block text-sm text-gray-700">
                        Allow self-registration for eligible voters
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Backup Settings */}
              {activeTab === 'backup' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-800">Backup and Data Settings</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Backup Frequency (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={settings.backup.backupFrequency}
                        onChange={(e) => handleChange('backup', 'backupFrequency', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        disabled={!settings.backup.autoBackup}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Retention (days)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="365"
                        value={settings.backup.retentionDays}
                        onChange={(e) => handleChange('backup', 'retentionDays', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Backups older than this will be automatically deleted
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="autoBackup"
                        checked={settings.backup.autoBackup}
                        onChange={(e) => handleChange('backup', 'autoBackup', e.target.checked)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="autoBackup" className="ml-2 block text-sm text-gray-700">
                        Enable automatic backups
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="includeAttachments"
                        checked={settings.backup.includeAttachments}
                        onChange={(e) => handleChange('backup', 'includeAttachments', e.target.checked)}
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="includeAttachments" className="ml-2 block text-sm text-gray-700">
                        Include attachments in backups
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mx-2">
                      Run Manual Backup
                    </button>
                    <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg mx-2">
                      Restore from Backup
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}