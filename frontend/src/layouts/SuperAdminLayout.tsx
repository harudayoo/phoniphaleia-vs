'use client';
import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSuperAdmin, SuperAdminProvider } from '@/contexts/SuperAdminContext';
import { usePathname } from 'next/navigation';
import SystemLogo2 from '@/components/SystemLogo2';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

const SIDEBAR_EXPANDED = 256; // px
const SIDEBAR_COLLAPSED = 47; // px (LOGO_SIZE / 2 + 16)

// Create an inner layout component that uses the context
function SuperAdminLayoutInner({ children }: SuperAdminLayoutProps) {
  const { superAdmin, loading, logout } = useSuperAdmin();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  // Handle window resize to detect mobile view
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkIsMobile();

    // Add resize listener
    window.addEventListener('resize', checkIsMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Pass collapsed state and setter to Sidebar for synchronization
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed}
        isMobileView={isMobile}
        handleLogout={logout}
      >
        <ul className="flex flex-col gap-2 mt-2">
          <li>
            <Link 
              href="/super_admin/dashboard"
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/super_admin/dashboard' ? 'bg-gray-200' : ''
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/super_admin/admins" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/super_admin/admins' ? 'bg-gray-200' : ''
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Admins</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/super_admin/requests" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/super_admin/requests' ? 'bg-gray-200' : ''
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span>Requests</span>
              {/* TODO: Add notification badge if there are pending requests */}
            </Link>
          </li>
          <li>
            <Link 
              href="/super_admin/account" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/super_admin/account' ? 'bg-gray-200' : ''
              }`}
            >
              <Settings2 className="w-5 h-5" />
              <span>Account Settings</span>
            </Link>
          </li>
        </ul>
      </Sidebar>
      
      {/* Animate the margin-left of the main content for smooth transition - only on desktop */}
      <motion.main
        initial={false}
        animate={{
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED),
        }}
        transition={{
          duration: 0.6,
          type: 'spring',
          stiffness: 120,
          damping: 18,
        }}
        className="flex-1 p-10"
        style={{ 
          minWidth: 0,
          paddingLeft: isMobile ? 'calc(1rem + 36px)' : undefined, // Add space for hamburger button on mobile
          paddingTop: isMobile ? '60px' : undefined, // Add space for the fixed header on mobile
        }}
      >
          {/* Mobile header that appears fixed at the top */}
          {isMobile && (
          <div className="fixed top-0 left-0 w-full z-20 py-3 px-4 bg-gray-50 shadow-sm flex items-center">
            <div className="ml-10">
              <SystemLogo2 
                width={120} 
                height={40} 
                alt="Phoniphaleia" 
              />
            </div>
          </div>
        )}

        {/* Super Admin info top-right - with animation */}
        <div className="flex justify-end items-center mb-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-right h-12 flex items-center"
              >
                <div className="w-32 h-5 bg-gray-200 rounded-md animate-pulse mb-2"></div>
                <div className="w-24 h-3 bg-gray-200 rounded-md animate-pulse"></div>
              </motion.div>
            ) : superAdmin ? (
              <motion.div 
                key="super-admin-info"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="text-right p-2 rounded-xl"
                style={{
                  background: 'linear-gradient(to left, rgba(220, 38, 38, 0.1), rgba(220, 38, 38, 0) 85%)'
                }}
              >
                <motion.div 
                  className="text-lg font-semibold text-red-900 text-shadow-gray-600"
                  layoutId="super-admin-name"
                >
                  {superAdmin.full_name} <span className="text-sm text-red-700">(Super Admin)</span>
                </motion.div>
                <motion.div 
                  className="text-sm text-gray-600"
                  layoutId="super-admin-id"
                >
                  ID Number: {superAdmin.id_number}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="no-super-admin"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-right"
              >
                <div className="text-lg font-semibold text-red-900">Session expired</div>
                <div className="text-sm text-gray-600">Redirecting...</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {children}
      </motion.main>
    </div>
  );
}

// Wrapper component that provides the context
export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  return (
    <SuperAdminProvider>
      <SuperAdminLayoutInner>{children}</SuperAdminLayoutInner>
    </SuperAdminProvider>
  );
}
