import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  icon?: LucideIcon;
  placeholder?: string;
}

export default function FilterSelect({
  value,
  onChange,
  options,
  icon: Icon,
  placeholder
}: FilterSelectProps) {
  return (
    <div className="relative">
      <select
        className="appearance-none bg-white border border-gray-300 text-gray-600 rounded-lg pl-10 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {Icon && <Icon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}