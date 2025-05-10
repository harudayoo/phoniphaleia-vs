'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface UserInfo {
  student_id: string;
  first_name: string;
  last_name: string;
  student_email: string;
  college_id: number;
  status: string;
}

interface UserContextType {
  user: UserInfo | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  logout: async () => {},
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
        }
        throw new Error('Failed to refresh session');
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  }, [API_URL]);

  const fetchUserData = async () => {
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
        status: userData.status
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

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
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, logout }}>
      {children}
    </UserContext.Provider>
  );
}