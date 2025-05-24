'use client';
import { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'xxxxl' | 'xxxxxl' | 'xxxxxxl' | 'xxxxxxxl' | 'xxxxxxxxl';
  footer?: ReactNode;
}

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'sm',
  footer 
}: ModalProps) => {
  // Close modal on escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Force body overflow hidden when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Force scroll to top to ensure modal is visible
      window.scrollTo(0, 0);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;
  const sizeClasses = {
    sm: 'max-w-sm w-full',
    md: 'max-w-md w-full',
    lg: 'max-w-lg w-full',
    xl: 'max-w-xl w-full',
    xxl: 'max-w-2xl w-full',
    xxxl: 'max-w-3xl w-full',
    xxxxl: 'max-w-4xl w-full',
    xxxxxl: 'max-w-5xl w-full',
    xxxxxxl: 'max-w-6xl w-full',
    xxxxxxxl: 'max-w-7xl w-full',
    xxxxxxxxl: 'max-w-8xl w-full',
    xxxxxxxxxl: 'max-w-8xl w-full', // alias for 8xl
  };
  const modalContent = (
    <div 
      className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fadeIn"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >      <div 
        className={`bg-white rounded-xl p-6 ${sizeClasses[size]} shadow-2xl animate-fadeIn relative mx-4`}
        onClick={e => e.stopPropagation()}        style={{
          position: 'relative',
          zIndex: 1000000,
          maxWidth: 
            size === 'sm' ? '24rem' : 
            size === 'md' ? '28rem' : 
            size === 'lg' ? '32rem' :
            size === 'xl' ? '36rem' :
            size === 'xxl' ? '42rem' :
            '90vw',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <div className="flex justify-between items-center mb-5 relative">
          <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
            <h3 className="text-xl font-bold text-gray-900 pointer-events-auto">{title}</h3>
          </div>
          <button 
            className="text-gray-500 hover:text-gray-700 ml-auto relative z-10" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mt-2 text-gray-800">
          {children}
        </div>
        
        {footer && (
          <div className="mt-8 flex justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default Modal;
