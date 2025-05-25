'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface SuperAdminInfo {
  full_name: string;
  id_number: string;
  username: string;
  email: string;
}

interface SuperAdminContextType {
  superAdmin: SuperAdminInfo | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType>({
  superAdmin: null,
  loading: true,
  logout: async () => {},
});

export function useSuperAdmin() {
  return useContext(SuperAdminContext);
}

export function SuperAdminProvider({ children }: { children: ReactNode }) {
  const [superAdmin, setSuperAdmin] = useState<SuperAdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Update last activity timestamp when super admin interacts with the page
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Function to refresh session
  const refreshSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('super_admin_token');
      if (!token) return;

      const response = await fetch(`${API_URL}/auth/refresh-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired, redirect to login
          localStorage.removeItem('super_admin_token');
          window.location.href = '/auth/super_admin_login';
        }
        throw new Error('Failed to refresh session');
      }
      
      // Store the new token
      const data = await response.json();
      if (data && data.token) {
        localStorage.setItem('super_admin_token', data.token);
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  }, [API_URL]);

  // Logout function
  const logout = async () => {
    try {
      const token = localStorage.getItem('super_admin_token');
      if (token) {
        await fetch(`${API_URL}/super_admin/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('super_admin_token');
      window.location.href = '/auth/super_admin_login';
    }
  };

  useEffect(() => {
    const superAdminToken = localStorage.getItem('super_admin_token');
    if (!superAdminToken) {
      setLoading(false);
      return;
    }

    // Only fetch super admin data if we don't already have it
    if (!superAdmin) {
      fetch(`${API_URL}/super_admin/me`, {
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
        },
      })
        .then((res) => {
          if (res.status === 401) {
            localStorage.removeItem('super_admin_token');
            window.location.href = '/auth/super_admin_login';
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data) {
            setSuperAdmin({
              full_name: data.full_name,
              id_number: data.id_number,
              username: data.username,
              email: data.email,
            });
          }
          setLoading(false);
        })
        .catch(() => {
          setSuperAdmin(null);
          setLoading(false);
          localStorage.removeItem('super_admin_token');
          window.location.href = '/auth/super_admin_login';
        });
    } else {
      setLoading(false);
    }
  }, [superAdmin, API_URL]);

  // Attach super admin activity listeners
  useEffect(() => {
    // List of events to track for super admin activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    // Add event listeners for each activity type
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Cleanup function to remove event listeners
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  // Periodically check if the super admin is still active and refresh the session
  useEffect(() => {
    // Check every minute if super admin has been active in the last 5 minutes
    const interval = setInterval(() => {
      const now = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;
      
      // If super admin has been active in the last 5 minutes, refresh the session
      if (now - lastActivity < fiveMinutesInMs) {
        refreshSession();
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [lastActivity, refreshSession]);

  return (
    <SuperAdminContext.Provider value={{ superAdmin, loading, logout }}>
      {children}
    </SuperAdminContext.Provider>
  );
}
