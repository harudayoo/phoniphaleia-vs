'use client';
import { useEffect, ReactNode } from 'react';
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
  size = 'md',
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

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    xxl: 'max-w-2xl',
    xxxl: 'max-w-3xl',
    xxxxl: 'max-w-4xl',
    xxxxxl: 'max-w-5xl',
    xxxxxxl: 'max-w-6xl',
    xxxxxxxl: 'max-w-7xl',
    xxxxxxxxl: 'max-w-8xl',
    xxxxxxxxxl: 'max-w-8xl', // alias for 8xl
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div 
        className={`bg-white rounded-xl p-6 w-full shadow-xl border border-gray-100 ${sizeClasses[size]} animate-fadeIn`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5 relative">
          <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
            <h3 className="text-xl font-bold text-red-950 pointer-events-auto">{title}</h3>
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
};

export default Modal;
