'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface UserInfo {
  student_id: string;
  first_name: string;
  last_name: string;
  student_email: string;
  college_id: number;
  status: string;
  photo_url?: string;
  id_metadata?: string;
  updated_at?: string; // Added for cache busting and LCP improvements
}

interface UserContextType {
  user: UserInfo | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  fetchUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshSession: async () => {},
  fetchUserData: async () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Update last activity timestamp when user interacts with the page
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Function to refresh session
  const refreshSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('voter_token');
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
          localStorage.removeItem('voter_token');
          localStorage.removeItem('user');
          window.location.href = '/auth/login';
          return;
        }
        throw new Error('Failed to refresh session');
      }
      
      // Store the new token if returned by the server
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('voter_token', data.token);
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  }, [API_URL]);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('voter_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/user/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        localStorage.removeItem('voter_token');
        setUser(null);
        window.location.href = '/auth/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }      
      const userData = await response.json();
      setUser({
        student_id: userData.student_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        student_email: userData.student_email,
        college_id: userData.college_id,
        status: userData.status,
        photo_url: userData.photo_url || undefined,
        id_metadata: userData.id_metadata || undefined,
        updated_at: userData.updated_at || undefined // Add updated_at from backend
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Don't clear user on network errors to prevent unnecessary logouts
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error, keep current user state
        console.warn('Network error occurred, keeping existing user state');
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // Function to handle logout
  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      localStorage.removeItem('voter_token');
      localStorage.removeItem('user');
      setUser(null);

      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Attach user activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  // Periodically check if the user is still active and refresh the session
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (now - lastActivity < fiveMinutesInMs) {
        refreshSession();
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [lastActivity, refreshSession]);

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);  // Add fetchUserData to dependencies

  return (
    <UserContext.Provider value={{ 
      user, 
      loading, 
      logout,
      refreshSession, 
      fetchUserData 
    }}>
      {children}
    </UserContext.Provider>
  );
}