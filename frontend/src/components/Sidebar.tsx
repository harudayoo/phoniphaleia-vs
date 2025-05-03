import React, { useState, ReactNode } from 'react';
import { Menu, X } from 'lucide-react';

interface SidebarProps {
  children?: ReactNode;
}

// Make logo smaller
const LOGO_SIZE = 62; // px, smaller logo

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  // Collapsed width: half logo + 16px padding (less padding for closer spacing)
  const collapsedWidth = LOGO_SIZE / 2 + 16;

  // Animation timing
  const animationDuration = 1000; // ms, even smoother and a bit longer

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-40
        bg-[#faf9f7] shadow-lg
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
            <span
              className={`
                transition-transform
                ${collapsed ? 'rotate-0' : 'rotate-90'}
              `}
              style={{
                transition: `transform ${animationDuration}ms cubic-bezier(0.4,0,0.2,1)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 0,
              }}
            >
              {collapsed ? <Menu size={18} strokeWidth={2.5} /> : <X size={18} strokeWidth={2.5} />}
            </span>
          </button>
        </div>
        {/* Logo */}
        <div
          className={`
            flex flex-col items-center
            transition-all
            ${collapsed ? 'mt-1 mb-2' : 'mt-8 mb-6'}
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
              background: '#e5e7eb',
              borderRadius: '9999px',
              borderColor: '#faf9f7',
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
      </div>
    </aside>
  );
};

export default Sidebar;