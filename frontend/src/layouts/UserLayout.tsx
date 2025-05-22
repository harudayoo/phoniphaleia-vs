'use client';
import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import SystemLogo2 from '@/components/SystemLogo2';
import {
  LayoutDashboard,
  Vote,
  History,
  FileCheck,
  HelpCircle,
  Settings2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, UserProvider } from '@/contexts/UserContext';
import { usePathname } from 'next/navigation';

interface UserLayoutProps {
  children: ReactNode;
}

const SIDEBAR_EXPANDED = 256; // px
const SIDEBAR_COLLAPSED = 47; // px (LOGO_SIZE / 2 + 16)

// Create an inner layout component that uses the context
function UserLayoutInner({ children }: UserLayoutProps) {
  const { user, loading } = useUser();
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
              href="/user/dashboard"
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/user/dashboard' ? 'bg-gray-200' : ''
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/user/votes" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/user/vote' ? 'bg-gray-200' : ''
              }`}
            >
              <Vote className="w-5 h-5" />
              <span>Cast Your Vote</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/user/history" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/user/history' ? 'bg-gray-200' : ''
              }`}
            >
              <History className="w-5 h-5" />
              <span>Voting History</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/user/results" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/user/results' ? 'bg-gray-200' : ''
              }`}
            >
              <FileCheck className="w-5 h-5" />
              <span>Election Results</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/user/help" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/user/help' ? 'bg-gray-200' : ''
              }`}
            >
              <HelpCircle className="w-5 h-5" />
              <span>Help Center</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/user/settings" 
              className={`flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium ${
                pathname === '/user/settings' ? 'bg-gray-200' : ''
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
        
        {/* User info top-right - with animation */}
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
              </motion.div>            ) : user ? (
              <motion.div 
                key="user-info"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(to left, rgba(253, 230, 138, 0.1), rgba(253, 230, 138, 0) 70%)'
                }}
              >
                {/* User photo */}
                {user.photo_url ? (
                  <motion.div 
                    className="h-12 w-12 overflow-hidden rounded-full border-2 border-red-700 shadow-md flex-shrink-0"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    key={user.photo_url + user.student_id} // Force re-render on user/photo change
                  >
                    {(() => { console.log('User photo_url:', user.photo_url); return null; })()}
                    <img
                      src={
                        user.photo_url.startsWith('http')
                          ? user.photo_url
                          : `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000'}${user.photo_url}`
                      }
                      alt={`${user.first_name}'s photo`}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/LogoNoText.png";
                      }}
                      style={{ display: 'block' }}
                    />
                  </motion.div>
                  
                ) : (
                  <motion.div 
                    className="h-12 w-12 rounded-full bg-red-100 text-red-800 flex items-center justify-center border-2 border-red-700 shadow-md font-bold text-lg flex-shrink-0"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                  </motion.div>
                )}
                
                {/* User info */}
                <div className="text-right">
                  <motion.div 
                    className="text-lg font-semibold text-red-900 text-shadow-gray-600"
                    layoutId="user-name"
                  >
                    Welcome, {user.first_name}
                  </motion.div>
                  <motion.div 
                    className="text-sm text-gray-600"
                    layoutId="user-id"
                  >
                    Student ID: {user.student_id}
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="no-user"
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
export default function UserLayout({ children }: UserLayoutProps) {
  return (
    <UserProvider>
      <UserLayoutInner>{children}</UserLayoutInner>
    </UserProvider>
  );
}