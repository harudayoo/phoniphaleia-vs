'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      window.location.href = '/auth/login';
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    
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
  }, [admin]);

  return (
    <AdminContext.Provider value={{ admin, loading }}>
      {children}
    </AdminContext.Provider>
  );
}