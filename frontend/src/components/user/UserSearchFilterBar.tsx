import React, { ReactNode } from 'react';
import { Search, Filter } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface UserSearchFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterValue: string;
  onFilterChange: (value: string) => void;
  filterOptions: Option[];
  searchPlaceholder?: string;
  filterPlaceholder?: string;
  children?: ReactNode;
}

const UserSearchFilterBar: React.FC<UserSearchFilterBarProps> = ({
  searchValue,
  onSearchChange,
  filterValue,
  onFilterChange,
  filterOptions,
  searchPlaceholder = 'Search...',
  children,
}) => (
  <div className="bg-white rounded-xl shadow p-4 mb-8 border border-gray-200">
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="relative">
        <select
          className="appearance-none bg-white border border-gray-300 rounded-lg pl-10 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
          value={filterValue}
          onChange={(e) => onFilterChange(e.target.value)}
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {children}
    </div>
  </div>
);

export default UserSearchFilterBar;