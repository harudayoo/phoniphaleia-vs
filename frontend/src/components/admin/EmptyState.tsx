import React from 'react';
import NothingIcon from '@/components/NothingIcon';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl shadow p-8 border border-gray-200 text-center">
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-700">
        <NothingIcon className="mb-4" width={64} height={64} />
        <span className="text-lg font-semibold">{title}</span>
        <p className="text-gray-500 mt-2">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}