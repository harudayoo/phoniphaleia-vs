import React from 'react';
import { PlusCircle } from 'lucide-react';
import { PositionsTabProps, Position } from '@/types/admin';
import DataView from './DataView';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';
import ResponsiveEntityList from './ResponsiveEntityList';

const PositionsTab: React.FC<PositionsTabProps> = ({
  positions,
  loading,
  onAdd,
  onEdit,
  onDelete
}) => {
  if (loading) {
    return <LoadingState message="Loading positions..." />;
  }

  if (!positions.length) {
    return (
      <EmptyState
        title="No positions found"
        description="Get started by creating your first position."
        action={
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700"
          >
            <PlusCircle size={16} />
            Add Position
          </button>
        }
      />
    );
  }

  const columns = [
    { 
      key: 'name',
      header: 'Name' 
    },
    { 
      key: 'organization_name',
      header: 'Organization' 
    },
    { 
      key: 'description',
      header: 'Description' 
    }
  ];

  return (
    <DataView
      title="Positions"
      description="Manage positions in the system"
      addButtonText="Add Position"
      onAdd={onAdd}
    >
      <ResponsiveEntityList<Position>
        entities={positions}
        columns={columns}
        onEdit={onEdit}
        onDelete={onDelete}
        idField="id"
      />
    </DataView>
  );
};

export default PositionsTab;