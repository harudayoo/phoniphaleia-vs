'use client';
import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  LayoutDashboard,
  CalendarCheck2,
  KeyRound,
  BarChart2,
  HelpCircle,
  Settings2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdmin, AdminProvider } from '@/contexts/AdminContext';
import { usePathname } from 'next/navigation';

interface AdminLayoutProps {
  children: ReactNode;
}

const SIDEBAR_EXPANDED = 256; // px
const SIDEBAR_COLLAPSED = 47; // px (LOGO_SIZE / 2 + 16)

// Create an inner layout component that uses the context
function AdminLayoutInner({ children }: AdminLayoutProps) {
  const { admin, loading } = useAdmin();
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
      >
        <ul className="flex flex-col gap-2 mt-2">
          <li>
            <Link 
              href="/admin/dashboard"
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/admin/dashboard' ? 'bg-gray-200' : ''
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/elections" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/admin/elections' ? 'bg-gray-200' : ''
              }`}
            >
              <CalendarCheck2 className="w-5 h-5" />
              <span>Election Management</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/security-keys" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/admin/security-keys' ? 'bg-gray-200' : ''
              }`}
            >
              <KeyRound className="w-5 h-5" />
              <span>Security and Keys</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/results" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/admin/results' ? 'bg-gray-200' : ''
              }`}
            >
              <BarChart2 className="w-5 h-5" />
              <span>Results</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/help-documentation" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/admin/help-documentation' ? 'bg-gray-200' : ''
              }`}
            >
              <HelpCircle className="w-5 h-5" />
              <span>Help and Documentation</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/admin/settings" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/admin/settings' ? 'bg-gray-200' : ''
              }`}
            >
              <Settings2 className="w-5 h-5" />
              <span>System Settings</span>
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
        }}
      >
        {/* Admin info top-right - with animation */}
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
            ) : admin ? (
              <motion.div 
                key="admin-info"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="text-right"
              >
                <motion.div 
                  className="text-lg font-semibold text-red-900 text-shadow-gray-600"
                  layoutId="admin-name"
                >
                  Welcome, {admin.full_name}
                </motion.div>
                <motion.div 
                  className="text-sm text-gray-600"
                  layoutId="admin-id"
                >
                  ID Number: {admin.id_number}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="no-admin"
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
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminProvider>
  );
}