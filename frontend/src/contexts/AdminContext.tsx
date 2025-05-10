'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface AdminInfo {
  full_name: string;
  id_number: string;
}

interface AdminContextType {
  admin: AdminInfo | null;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType>({ admin: null, loading: true });

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Update last activity timestamp when admin interacts with the page
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Function to refresh session
  const refreshSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
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
          localStorage.removeItem('admin_token');
          window.location.href = '/auth/admin_login';
        }
        throw new Error('Failed to refresh session');
      }
      
      // Store the new token
      const data = await response.json();
      if (data && data.token) {
        localStorage.setItem('admin_token', data.token);
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  }, [API_URL]);

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      window.location.href = '/auth/login';
      return;
    }

    // Only fetch admin data if we don't already have it
    if (!admin) {
      fetch(`${API_URL}/admin/me`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
        .then((res) => {
          if (res.status === 401) {
            window.location.href = '/auth/login';
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data) {
            setAdmin({
              full_name: data.full_name,
              id_number: data.id_number,
            });
          }
          setLoading(false);
        })
        .catch(() => {
          setAdmin(null);
          setLoading(false);
          window.location.href = '/auth/login';
        });
    } else {
      setLoading(false);
    }
  }, [admin, API_URL]);

  // Attach admin activity listeners
  useEffect(() => {
    // List of events to track for admin activity
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

  // Periodically check if the admin is still active and refresh the session
  useEffect(() => {
    // Check every minute if admin has been active in the last 5 minutes
    const interval = setInterval(() => {
      const now = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;
      
      // If admin has been active in the last 5 minutes, refresh the session
      if (now - lastActivity < fiveMinutesInMs) {
        refreshSession();
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [lastActivity, refreshSession]);

  return (
    <AdminContext.Provider value={{ admin, loading }}>
      {children}
    </AdminContext.Provider>
  );
}