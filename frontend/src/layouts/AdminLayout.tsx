'use client';
import { useEffect, useState, ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  LayoutDashboard,
  CalendarCheck2,
  KeyRound,
  BarChart2,
  HelpCircle,
  Settings2,
} from 'lucide-react';

interface AdminInfo {
  full_name: string;
  id_number: string;
}

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      window.location.href = '/auth/login';
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
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
      })
      .catch(() => {
        setAdmin(null);
        window.location.href = '/auth/login';
      });
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar>
        <ul className="flex flex-col gap-2 mt-2">
          <li>
            <a href="/admin/dashboard" className="flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium">
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a href="/admin/elections" className="flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium">
              <CalendarCheck2 className="w-5 h-5" />
              <span>Election Management</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium">
              <KeyRound className="w-5 h-5" />
              <span>Security and Keys</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium">
              <BarChart2 className="w-5 h-5" />
              <span>Results</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium">
              <HelpCircle className="w-5 h-5" />
              <span>Help and Documentation</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium">
              <Settings2 className="w-5 h-5" />
              <span>System Settings</span>
            </a>
          </li>
        </ul>
      </Sidebar>
      <main className="flex-1 ml-64 p-10">
        {/* Admin info top-right */}
        <div className="flex justify-end items-center mb-8">
          {admin && (
            <div className="text-right">
              <div className="text-lg font-semibold text-red-900 text-shadow-gray-600">Welcome, {admin.full_name}</div>
              <div className="text-sm text-gray-600">ID Number: {admin.id_number}</div>
            </div>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}