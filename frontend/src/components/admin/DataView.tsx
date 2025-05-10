import React from 'react';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

interface DataViewProps<T> {
  data: T[];
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  view: 'grid' | 'list';
  renderGridItem: (item: T, index: number) => React.ReactNode;
  renderListItem: (item: T, index: number) => React.ReactNode;
  renderTable?: () => React.ReactNode;
  loadingType?: 'default' | 'card' | 'table';
}

export default function DataView<T>({
  data,
  isLoading,
  emptyTitle,
  emptyDescription,
  emptyAction,
  view,
  renderGridItem,
  renderListItem,
  renderTable,
  loadingType = 'default'
}: DataViewProps<T>) {
  if (isLoading) {
    return <LoadingState view={view} count={6} type={loadingType} />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  if (view === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((item, index) => renderGridItem(item, index))}
      </div>
    );
  }

  // If renderTable is provided, use it for list view
  if (renderTable) {
    return renderTable();
  }

  // Otherwise use the default list view
  return (
    <div className="space-y-4">
      {data.map((item, index) => renderListItem(item, index))}
    </div>
  );
}