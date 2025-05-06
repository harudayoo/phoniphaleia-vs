'use client';
import { AdminProvider } from '@/contexts/AdminContext';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Loader2 from '@/components/Loader2';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [currentChildren, setCurrentChildren] = useState(children);
  const previousPathRef = useRef(pathname);
  const [contentVisible, setContentVisible] = useState(true);

  // Prevents initial animation on first page load
  useEffect(() => {
    // Set initial children without animation
    setCurrentChildren(children);
  }, []);

  // Handle transitions between admin pages with improved timing
  useEffect(() => {
    // Skip if path hasn't changed
    if (previousPathRef.current === pathname) return;

    // Step 1: Hide current content and show loader
    setContentVisible(false);
    setIsLoading(true);

    // Prevent scrolling during transition
    if (typeof window !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    // Step 2: After content fades out, update to new content (while still hidden)
    const contentUpdateTimeout = setTimeout(() => {
      setCurrentChildren(children);
      previousPathRef.current = pathname;
      
      // Step 3: Pre-render new content behind loader
      // (This gives React time to fully render the new page components)
      const preRenderTimeout = setTimeout(() => {
        // Step 4: Hide loader and show new content simultaneously
        const finishTransitionTimeout = setTimeout(() => {
          setIsLoading(false);
          // Small delay before showing content to allow loader exit animation
          setTimeout(() => {
            setContentVisible(true);
            
            // Restore scrolling and ensure page is at top
            if (typeof window !== 'undefined') {
              document.body.style.overflow = '';
              window.scrollTo(0, 0);
            }
          }, 150);
        }, 400); // Keep loader visible a bit longer
        
        return () => clearTimeout(finishTransitionTimeout);
      }, 200); // Give time for React to render content
      
      return () => clearTimeout(preRenderTimeout);
    }, 300);

    return () => clearTimeout(contentUpdateTimeout);
  }, [pathname, children]);

  return (
    <AdminProvider>
      <div className="relative min-h-screen bg-gray-50">
        {/* Main content container */}
        <div className="relative w-full">
          {/* Current page content with visibility control */}
          <div className={`transition-opacity duration-300 ${contentVisible ? 'opacity-100' : 'opacity-0'}`}>
            {currentChildren}
          </div>
        </div>

        {/* Loader overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-gray-50/90 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <div className="w-40 h-40">
                <Loader2 width="100%" height="100%" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminProvider>
  );
}