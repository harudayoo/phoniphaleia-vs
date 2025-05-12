import React, { ReactNode } from 'react';
import { Search } from 'lucide-react';
import ViewToggle from './ViewToggle';

interface SearchFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  view?: 'grid' | 'list';
  onViewChange?: (view: 'grid' | 'list') => void;
}

export default function SearchFilterBar({ 
  searchValue, 
  onSearchChange, 
  searchPlaceholder = "Search...", 
  children,
  view,
  onViewChange
}: SearchFilterBarProps) {
  return (
    <div className="bg-white rounded-xl shadow p-4 mt-2 mb-8 border border-gray-200">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-600" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {children}
          
          {view !== undefined && onViewChange && (
            <ViewToggle view={view} onChange={onViewChange} />
          )}
        </div>
      </div>
    </div>
  );
}