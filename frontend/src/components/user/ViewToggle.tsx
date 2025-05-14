import React from 'react';
import { FaThLarge, FaList } from 'react-icons/fa';

interface ViewToggleProps {
  view: 'grid' | 'list';
  onChange: (view: 'grid' | 'list') => void;
  className?: string;
}

export default function ViewToggle({ view, onChange, className = '' }: ViewToggleProps) {
  return (
    <div className={`flex ${className}`}>
      <button
        className={`p-2 rounded border transition-all duration-200 ${
          view === 'grid'
            ? 'bg-red-800/10 border-red-600 shadow-sm'
            : 'border-gray-300 bg-white'
        }`}
        onClick={() => onChange('grid')}
        aria-label="Grid view"
      >
        <FaThLarge className={view === 'grid' ? "text-red-600" : "text-gray-600"} />
      </button>
      <button
        className={`p-2 rounded border transition-all duration-200 ml-2 ${
          view === 'list'
            ? 'bg-red-800/10 border-red-700 shadow-sm'
            : 'border-gray-300 bg-white'
        }`}
        onClick={() => onChange('list')}
        aria-label="List view"
      >
        <FaList className={view === 'list' ? "text-red-600" : "text-gray-600"} />
      </button>
    </div>
  );
}