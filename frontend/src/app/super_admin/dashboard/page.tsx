'use client';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import { useState, useEffect } from 'react';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { BarChart3, Users, ClipboardList, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalAdmins: number;
  pendingRequests: number;
}

export default function SuperAdminDashboard() {
  const { superAdmin, loading } = useSuperAdmin();
  const [stats, setStats] = useState<DashboardStats>({
    totalAdmins: 0,
    pendingRequests: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!superAdmin) return;
      
      try {
        setLoadingStats(true);
        const token = localStorage.getItem('super_admin_token');
        
        const [adminsResponse, requestsResponse] = await Promise.all([
          fetch(`${API_URL}/super_admin/admins`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_URL}/super_admin/pending_admins`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        if (adminsResponse.ok && requestsResponse.ok) {
          const adminsData = await adminsResponse.json();
          const requestsData = await requestsResponse.json();
          
          setStats({
            totalAdmins: adminsData.length,
            pendingRequests: requestsData.length
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    
    fetchDashboardStats();
  }, [superAdmin, API_URL]);
  
  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome to the super admin control panel.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Admin Stats Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Admins</h2>
              <span className="p-2 bg-red-100 rounded-full">
                <Users className="h-5 w-5 text-red-700" />
              </span>
            </div>
            <div className="mt-4">
              {loadingStats ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-3xl font-bold text-gray-800">{stats.totalAdmins}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">Total administrators</p>
            </div>
            <Link href="/super_admin/admins" className="mt-4 inline-flex items-center text-sm text-red-700 hover:text-red-800">
              View all admins
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          {/* Pending Requests Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Pending Requests</h2>
              <span className="p-2 bg-amber-100 rounded-full">
                <ClipboardList className="h-5 w-5 text-amber-700" />
              </span>
            </div>
            <div className="mt-4">
              {loadingStats ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <div className="flex items-center">
                  <p className="text-3xl font-bold text-gray-800">{stats.pendingRequests}</p>
                  {stats.pendingRequests > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      New
                    </span>
                  )}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-1">Admin access requests</p>
            </div>
            <Link href="/super_admin/requests" className="mt-4 inline-flex items-center text-sm text-amber-700 hover:text-amber-800">
              Review requests
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          {/* Account Settings Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Account Settings</h2>
              <span className="p-2 bg-blue-100 rounded-full">
                <BarChart3 className="h-5 w-5 text-blue-700" />
              </span>
            </div>
            <div className="mt-4">
              {loading ? (
                <div className="h-5 w-32 bg-gray-200 animate-pulse rounded mb-2"></div>
              ) : (
                <p className="text-md font-medium text-gray-800">{superAdmin?.full_name}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">Manage your account</p>
            </div>
            <Link href="/super_admin/account" className="mt-4 inline-flex items-center text-sm text-blue-700 hover:text-blue-800">
              View settings
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h2>
          <div className="p-6 text-center text-gray-500">
            <p>Activity log will be displayed here.</p>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
