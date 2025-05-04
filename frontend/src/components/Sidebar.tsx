import React, { useState, ReactNode } from 'react';
import { Menu, X, LogOut } from 'lucide-react';

interface SidebarProps {
  children?: ReactNode;
}

const LOGO_SIZE = 62; // px, smaller logo

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  // Collapsed width: half logo + 16px padding (less padding for closer spacing)
  const collapsedWidth = LOGO_SIZE / 2 + 16;

  // Animation timing
  const animationDuration = 800; // ms

  // Theme colors (remove dark mode logic)
  const sidebarBg = 'linear-gradient(to right, #faf9f7, #f9fafb)';
  const logoBorderColor = '#f9fafb';
  const logoBg = '#e5e7eb';

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      // Remove all tokens and user info from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('admin_token'); // Remove admin token as well
   
      // Redirect to login page
      window.location.href = '/auth/login';
    } catch {
      alert('Logout failed');
    }
  };

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-40
        shadow-lg
        border-l-0
        transition-all
      `}
      style={{
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: 'none',
        boxShadow: '0 0 0 4px transparent',
        borderRadius: '0 1.5rem 1.5rem 0',
        width: collapsed ? `${collapsedWidth}px` : '16rem',
        minWidth: collapsed ? `${collapsedWidth}px` : '16rem',
        maxWidth: collapsed ? `${collapsedWidth}px` : '16rem',
        transition: `width ${animationDuration}ms cubic-bezier(0.4,0,0.2,1)`,
        background: sidebarBg,
      }}
    >
      {/* Gradient border line */}
      <div
        className="absolute left-0 top-0 h-full"
        style={{
          width: '6px',
          borderTopRightRadius: '1.5rem',
          borderBottomRightRadius: '1.5rem',
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          background: 'linear-gradient(to bottom, #7f1d1d, #b91c1c, #f87171)',
        }}
      />
      <div
        className={`
          relative flex flex-col h-full pl-6 pr-2 py-6 items-stretch
          transition-all
        `}
        style={{
          transition: `padding ${animationDuration}ms cubic-bezier(0.4,0,0.2,1)`,
        }}
      >
        {/* Hamburger Menu Button */}
        <div
          className="relative"
          style={{
            height: '36px',
            marginBottom: collapsed ? '8px' : '32px', // less margin when collapsed
            transition: `margin-bottom ${animationDuration}ms cubic-bezier(0.4,0,0.2,1)`,
          }}
        >
          <button
            className={`
              absolute
              top-0
              ${collapsed ? 'left-1/2 -translate-x-1/2' : 'right-0'}
              flex items-center justify-center
              hover:bg-gray-200
              focus:outline-none
              transition-all
            `}
            style={{
              transition: `all ${animationDuration}ms cubic-bezier(0.4,0,0.2,1)`,
              width: '24px',
              height: '24px',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              color: '#b91c1c',
              zIndex: 10,
              fontSize: 0,
            }}
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {/* Animated icon transition */}
            <span
              className="relative flex items-center justify-center"
              style={{
                width: '24px',
                height: '24px',
              }}
            >
              {/* Hamburger Icon */}
              <span
                className={`
                  absolute inset-0 flex items-center justify-center
                  transition-transform transition-opacity
                  duration-[${animationDuration}ms]
                  ${collapsed ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-75 rotate-90'}
                `}
                style={{
                  transition: `all ${animationDuration}ms cubic-bezier(0.4,0,0.2,1)`,
                  pointerEvents: collapsed ? 'auto' : 'none',
                }}
              >
                <Menu size={18} strokeWidth={2.5} />
              </span>
              {/* X Icon */}
              <span
                className={`
                  absolute inset-0 flex items-center justify-center
                  transition-transform transition-opacity
                  duration-[${animationDuration}ms]
                  ${collapsed ? 'opacity-0 scale-75 -rotate-90' : 'opacity-100 scale-100 rotate-0'}
                `}
                style={{
                  transition: `all ${animationDuration}ms cubic-bezier(0.4,0,0.2,1)`,
                  pointerEvents: collapsed ? 'none' : 'auto',
                }}
              >
                <X size={18} strokeWidth={2.5} />
              </span>
            </span>
          </button>
        </div>
        {/* Logo */}
        <div
          className={`
            flex flex-col items-center
            transition-all
            ${collapsed ? 'mt-1 mb-2' : 'mt-2 mb-6'}
          `}
          style={{
            transition: `margin ${animationDuration}ms cubic-bezier(0.4,0,0.2,1)`,
            position: collapsed ? 'relative' : undefined,
            minHeight: `${LOGO_SIZE}px`,
          }}
        >
          <div
            className={`
              flex items-center justify-center
              transition-all
              ${collapsed ? '' : ''}
            `}
            style={{
              width: `${LOGO_SIZE}px`,
              height: `${LOGO_SIZE}px`,
              background: logoBg,
              borderRadius: '9999px',
              borderColor: logoBorderColor,
              borderStyle: 'solid',
              borderWidth: '4px',
              transition: `
                border-color ${animationDuration}ms cubic-bezier(0.4,0,0.2,1),
                border-width ${animationDuration}ms cubic-bezier(0.4,0,0.2,1),
                transform ${animationDuration}ms cubic-bezier(0.4,0,0.2,1),
                left ${animationDuration}ms cubic-bezier(0.4,0,0.2,1)
              `,
              position: collapsed ? 'absolute' : 'static',
              left: collapsed ? 'calc(100% + 5px)' : undefined,
              top: collapsed ? 0 : undefined,
              transform: collapsed
                ? `translateX(-50%) scale(1.08)`
                : 'translateX(0) scale(1)',
              boxShadow: 'none',
              zIndex: 20,
            }}
          >
            <span
              className="text-gray-400 text-xl font-bold"
              style={{
                transition: `opacity ${animationDuration}ms cubic-bezier(0.4,0,0.2,1)`,
                opacity: collapsed ? 0.85 : 1,
              }}
            >
              Logo
            </span>
          </div>
          <div
            className={`
              transition-all
              ${collapsed ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100 max-h-20'}
            `}
            style={{
              transition: `all ${animationDuration}ms cubic-bezier(0.4,0,0.2,1)`,
            }}
          >
            {!collapsed && (
              <>
                <div className="text-xl font-bold text-gray-800 text-center">Phonipháleia</div>
                <div className="text-xs text-gray-500 text-center">voting platform</div>
              </>
            )}
          </div>
        </div>
        {/* Sidebar Content */}
        <nav
          className={`
            flex-1 mt-6 w-full
            transition-all
            ${collapsed ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100 max-h-[1000px]'}
          `}
          style={{
            transition: `all ${animationDuration}ms cubic-bezier(0.4,0,0.2,1)`,
          }}
        >
          {children}
        </nav>
        {/* Remove Theme Button */}
        <div className={`flex flex-col gap-2 mt-auto pb-2`}>
          <button
            className={`
              flex items-center justify-center gap-2 w-full py-2 rounded-lg
              text-sm font-medium
              transition-colors
              bg-red-100 text-red-700 hover:bg-red-200
            `}
            onClick={handleLogout}
            aria-label="Logout"
          >
            <LogOut size={18} />
            {collapsed ? '' : 'Logout'}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;