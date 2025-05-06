import React, { ReactNode, useEffect, useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  children?: ReactNode;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isMobileView?: boolean; // Add this to receive mobile state from parent
}

const LOGO_SIZE = 62; // px, smaller logo

const Sidebar: React.FC<SidebarProps> = ({ 
  children, 
  collapsed, 
  setCollapsed,
  isMobileView // Receive from parent
}) => {
  // Collapsed width: half logo + 16px padding (less padding for closer spacing)
  const collapsedWidth = LOGO_SIZE / 2 + 16;

  // Animation timing
  const animationDuration = 0.6; // seconds for framer-motion

  // Theme colors
  const sidebarBg = 'linear-gradient(to right, #fefbf3, #fefdf7, #f9fafb)';
  const logoBorderColor = '#f9fafb';
  const logoBg = '#e5e7eb';

  // Use isMobileView from props if provided, otherwise detect internally
  const [isMobile, setIsMobile] = useState(isMobileView || false);
  
  // State for tracking if mobile menu is open
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [contentHidden, setContentHidden] = useState(false);

  // Handle window resize to detect mobile view only if isMobileView not provided
  useEffect(() => {
    if (isMobileView !== undefined) {
      setIsMobile(isMobileView);
      return;
    }
    
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is typical tablet breakpoint
    };

    // Check on mount
    checkIsMobile();

    // Add resize listener
    window.addEventListener('resize', checkIsMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIsMobile);
  }, [isMobileView]);

  // Force sidebar to be collapsed on mobile when not open
  useEffect(() => {
    if (isMobile && !mobileMenuOpen) {
      setCollapsed(true);
    }
  }, [isMobile, mobileMenuOpen, setCollapsed]);

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('admin_token');
      window.location.href = '/auth/login';
    } catch {
      alert('Logout failed');
    }
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Animate content out before collapsing sidebar
  useEffect(() => {
    if (collapsed) {
      setContentHidden(true);
    } else {
      // Delay to allow sidebar to expand before showing content
      const timeout = setTimeout(() => setContentHidden(false), animationDuration * 500);
      return () => clearTimeout(timeout);
    }
  }, [collapsed]);

  return (
    <>
      {/* Mobile hamburger menu button - only visible on mobile */}
      {isMobile && (
        <div className="z-50">
          <button 
            className="fixed top-4 left-4 p-2 bg-white rounded-md shadow-md text-red-700 hover:bg-gray-100"
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Mobile dropdown menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                {/* Frosted glass overlay that closes the menu when clicked outside */}
                <motion.div 
                  className="fixed inset-0 backdrop-blur-sm bg-white/30 z-40"
                  onClick={closeMobileMenu}
                  aria-hidden="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
                
                {/* Dropdown menu container */}
                <motion.div 
                  className="fixed top-0 left-0 w-full z-50 overflow-auto max-h-screen"
                  initial={{ y: -500, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -500, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-b-xl mx-4 mt-16 p-4 border border-gray-200/50 relative">
                    {/* Close button */}
                    <button
                      className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 text-gray-500"
                      onClick={closeMobileMenu}
                      aria-label="Close menu"
                    >
                      <X size={18} />
                    </button>
                    
                    {/* App Title */}
                    <div className="flex items-center justify-center mb-6 mt-2">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center border-4 border-white/90">
                          <span className="text-gray-500 font-bold">Logo</span>
                        </div>
                        <div className="text-xl font-bold text-gray-800 mt-2">Phonipháleia</div>
                        <div className="text-xs text-gray-500">Voting Platform</div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="flex flex-col gap-2 mb-6">
                      {children}
                    </div>
                    
                    {/* Logout Button */}
                    <button
                      className="flex items-center justify-center gap-2 w-full rounded-md p-2 bg-red-100/90 text-red-700 hover:bg-red-200 transition-colors"
                      onClick={handleLogout}
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <motion.aside
          initial={false}
          animate={{
            width: contentHidden ? collapsedWidth : 256,
            minWidth: contentHidden ? collapsedWidth : 256,
            maxWidth: contentHidden ? collapsedWidth : 256,
          }}
          transition={{
            duration: animationDuration,
            type: 'spring',
            stiffness: 120,
            damping: 18,
            delay: collapsed ? animationDuration / 2 : 0,
          }}
          className="fixed top-0 left-0 h-full z-40 shadow-lg border-l-0 transition-all"
          style={{
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
            borderBottom: 'none',
            boxShadow: '0 0 0 4px transparent',
            borderRadius: '0 1.5rem 1.5rem 0',
            background: 'transparent',
            overflow: 'visible',
          }}
        >
          {/* Gradient border line */}
          <motion.div
            className="absolute left-0 top-0 h-full"
            animate={{
              width: collapsed ? Math.min(6, collapsedWidth) : 6,
            }}
            transition={{ duration: animationDuration }}
            style={{
              borderTopRightRadius: '1.5rem',
              borderBottomRightRadius: '1.5rem',
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              background: 'linear-gradient(to bottom, #7f1d1d, #b91c1c, #f87171)',
              zIndex: 1,
            }}
          />
          {/* Animated background gradient */}
          <motion.div
            className="absolute top-0 left-0 h-full"
            animate={{
              width: collapsed ? collapsedWidth : 256,
            }}
            transition={{
              duration: animationDuration,
              type: 'spring',
              stiffness: 120,
              damping: 18,
            }}
            style={{
              background: sidebarBg,
              borderRadius: '0 1.5rem 1.5rem 0',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />
          {/* Content */}
          <div
            className="relative flex flex-col h-full items-stretch transition-all"
            style={{
              height: '100%',
              width: '100%',
              paddingLeft: collapsed ? 0 : 24,
              paddingRight: 8,
              paddingTop: 24,
              paddingBottom: 24,
              transition: `padding ${animationDuration}s cubic-bezier(0.4,0,0.2,1)`,
              zIndex: 3,
            }}
          >
            {/* Hamburger Menu Button - only visible on desktop */}
            <div
              className="relative"
              style={{
                height: '36px',
                marginBottom: collapsed ? '8px' : '32px',
                transition: `margin-bottom ${animationDuration}s cubic-bezier(0.4,0,0.2,1)`,
                display: 'flex',
                justifyContent: collapsed ? 'flex-start' : 'flex-end',
                marginLeft: 12,
              }}
            >
              <button
                className={`
                  absolute
                  top-0
                  ${collapsed ? 'left-0' : 'right-0'}
                  flex items-center justify-center
                  hover:bg-gray-200
                  focus:outline-none
                  transition-all
                `}
                style={{
                  transition: `all ${animationDuration}s cubic-bezier(0.4,0,0.2,1)`,
                  width: '24px',
                  height: '24px',
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  color: '#b91c1c',
                  zIndex: 10,
                  fontSize: 0,
                  left: collapsed ? 0 : undefined,
                  right: collapsed ? undefined : 0,
                }}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <span
                  className="relative flex items-center justify-center"
                  style={{
                    width: '24px',
                    height: '24px',
                  }}
                >
                  {collapsed ? (
                    <motion.span
                      key="menu"
                      initial={{ opacity: 0, rotate: 90, scale: 0.75 }}
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, rotate: 90, scale: 0.75 }}
                      transition={{ duration: animationDuration / 2 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Menu size={18} strokeWidth={2.5} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="close"
                      initial={{ opacity: 0, rotate: -90, scale: 0.75 }}
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, rotate: -90, scale: 0.75 }}
                      transition={{ duration: animationDuration / 2 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <X size={18} strokeWidth={2.5} />
                    </motion.span>
                  )}
                </span>
              </button>
            </div>

            {/* Logo */}
            <motion.div
              className={`
                flex flex-col items-center
                transition-all
                ${collapsed ? 'mt-1 mb-2' : 'mt-2 mb-6'}
              `}
              style={{
                position: 'relative',
                alignItems: collapsed ? 'flex-start' : 'center',
                minHeight: `${LOGO_SIZE}px`,
                zIndex: 20,
                pointerEvents: 'none',
                transition: `left ${animationDuration}s cubic-bezier(0.4,0,0.2,1)`,
                marginLeft: 12,
              }}
              animate={{
                marginTop: collapsed ? 4 : 8,
                marginBottom: collapsed ? 8 : 24,
              }}
              transition={{ duration: animationDuration }}
            >
              <motion.div
                className="flex items-center justify-center transition-all"
                style={{
                  width: `${LOGO_SIZE}px`,
                  height: `${LOGO_SIZE}px`,
                  background: logoBg,
                  borderRadius: '9999px',
                  borderColor: logoBorderColor,
                  borderStyle: 'solid',
                  borderWidth: '4px',
                  boxShadow: 'none',
                  zIndex: 20,
                  marginLeft: collapsed ? 0 : 'auto',
                  marginRight: collapsed ? 'auto' : 'auto',
                }}
                animate={{
                  x: 0,
                  scale: collapsed ? 1.08 : 1,
                  opacity: collapsed ? 0.85 : 1,
                }}
                transition={{ duration: animationDuration }}
              >
                <span
                  className="text-gray-400 text-xl font-bold"
                  style={{
                    opacity: collapsed ? 0.85 : 1,
                  }}
                >
                  Logo
                </span>
              </motion.div>
              <motion.div
                initial={false}
                animate={{
                  opacity: collapsed ? 0 : 1,
                  height: collapsed ? 0 : 'auto',
                  marginTop: collapsed ? 0 : 8,
                }}
                transition={{ duration: animationDuration / 1.5 }}
                style={{
                  overflow: 'hidden',
                  width: '100%',
                  pointerEvents: collapsed ? 'none' : 'auto',
                }}
              >
                <div className="text-xl font-bold text-gray-800 text-center">Phonipháleia</div>
                <div className="text-xs text-gray-500 text-center">Voting Platform</div>
              </motion.div>
            </motion.div>
            
            {/* Sidebar Content */}
            <motion.nav
              initial={false}
              animate={{
                opacity: !contentHidden ? 1 : 0,
                x: !contentHidden ? 0 : -40,
                height: !contentHidden ? 'auto' : 0,
                marginTop: !contentHidden ? 24 : 0,
              }}
              transition={{ duration: animationDuration / 2 }}
              className="flex-1 w-full"
              style={{
                overflow: 'hidden',
                pointerEvents: !contentHidden ? 'auto' : 'none',
              }}
            >
              {children}
            </motion.nav>

            {/* Expanded/Collapsed Logout Button at Bottom */}
            <div className="mt-auto pb-2">
              <motion.button
                className="flex items-center justify-center transition-colors bg-red-100 hover:bg-red-200 text-red-700"
                onClick={handleLogout}
                aria-label="Logout"
                initial={false}
                animate={{
                  width: collapsed ? 36 : '100%',
                  height: 36,
                  borderRadius: collapsed ? 6 : 12,
                  marginLeft: collapsed ? 12 : 0,
                  background: '#fee2e2',
                  boxShadow: 'none',
                  border: 'none',
                  alignSelf: collapsed ? 'flex-start' : 'stretch',
                }}
                transition={{ duration: animationDuration / 2 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  overflow: 'hidden',
                }}
              >
                <LogOut size={18} color="#b91c1c" />
                {!collapsed && (
                  <motion.span
                    initial={false}
                    animate={{
                      opacity: 1,
                      width: 'auto',
                      marginLeft: 8,
                    }}
                    transition={{ duration: animationDuration / 1.5 }}
                    style={{ overflow: 'hidden', display: 'inline-block', whiteSpace: 'nowrap' }}
                  >
                    Logout
                  </motion.span>
                )}
              </motion.button>
            </div>
          </div>
        </motion.aside>
      )}
    </>
  );
};

export default Sidebar;