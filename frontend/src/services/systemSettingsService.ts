import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface SystemSettings {
  general: {
    systemName: string;
    contactEmail: string;
    supportPhone: string;
    maintenanceMode: boolean;
    copyrightText: string;
  };
  elections: {
    defaultDuration: number;
    reminderHours: number;
    resultDelay: number;
    minimumCandidates: number;
    requireConfirmation: boolean;
  };
  security: {
    sessionTimeout: number;
    failedAttempts: number;
    passwordExpiryDays: number;
    mfaRequired: boolean;
    ipRestriction: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    adminAlerts: boolean;
    resultNotifications: boolean;
    systemAlerts: boolean;
  };
  users: {
    autoApprove: boolean;
    allowSelfRegistration: boolean;
    inactivityDays: number;
    maxAdminUsers: number;
  };
  backup: {
    autoBackup: boolean;
    backupFrequency: number;
    retentionDays: number;
    includeAttachments: boolean;
  };
}

// Type for individual setting categories
type SettingValue = string | number | boolean;
type CategorySettings = Record<string, SettingValue>;

// API response types
interface SettingDetails {
  setting_id: number;
  category: string;
  setting_key: string;
  setting_value: SettingValue;
  data_type: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface SettingResponse {
  category: string;
  setting_key: string;
  value: SettingValue;
}

interface SettingUpdateResponse {
  message: string;
  setting: SettingDetails;
}

class SystemSettingsService {  private getAuthHeader() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      console.warn('No admin token found in localStorage');
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
  }  async getAllSettings(): Promise<SystemSettings> {
    try {
      const response = await axios.get(`${API_URL}/admin/settings`, {
        headers: this.getAuthHeader(),
      });
      
      // Validate response data structure
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid response format from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (status === 403) {
          throw new Error('Access denied. Insufficient permissions.');
        } else if (status === 404) {
          throw new Error('Settings endpoint not found. Please contact support.');
        } else if (status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
      }
      throw new Error('Failed to fetch settings. Please check your connection and try again.');
    }
  }

  async updateSettings(settings: SystemSettings): Promise<{ message: string; updated_categories: string[] }> {
    try {
      const response = await axios.put(`${API_URL}/admin/settings`, settings, {
        headers: {
          ...this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  }
  async getCategorySettings(category: string): Promise<CategorySettings> {
    try {
      const response = await axios.get(`${API_URL}/admin/settings/${category}`, {
        headers: this.getAuthHeader(),
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${category} settings:`, error);
      throw error;
    }
  }

  async updateCategorySettings(category: string, settings: CategorySettings): Promise<{ message: string; category: string }> {
    try {
      const response = await axios.put(`${API_URL}/admin/settings/${category}`, settings, {
        headers: {
          ...this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating ${category} settings:`, error);
      throw error;
    }
  }

  async getSetting(category: string, settingKey: string): Promise<SettingResponse> {
    try {
      const response = await axios.get(`${API_URL}/admin/settings/${category}/${settingKey}`, {
        headers: this.getAuthHeader(),
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching setting ${category}.${settingKey}:`, error);
      throw error;
    }
  }

  async setSetting(category: string, settingKey: string, value: SettingValue, description?: string): Promise<SettingUpdateResponse> {
    try {
      const response = await axios.put(`${API_URL}/admin/settings/${category}/${settingKey}`, {
        value,
        description,
      }, {
        headers: {
          ...this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error setting ${category}.${settingKey}:`, error);
      throw error;
    }
  }

  async initializeDefaultSettings(): Promise<{ message: string }> {
    try {
      const response = await axios.post(`${API_URL}/admin/settings/initialize`, {}, {
        headers: this.getAuthHeader(),
      });
      return response.data;
    } catch (error) {
      console.error('Error initializing default settings:', error);
      throw error;
    }
  }
}

const systemSettingsService = new SystemSettingsService();
export default systemSettingsService;
export type { SystemSettings, SettingValue, CategorySettings, SettingResponse, SettingUpdateResponse, SettingDetails };
