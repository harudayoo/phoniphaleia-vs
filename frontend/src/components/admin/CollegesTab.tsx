import React from 'react';
import { PlusCircle } from 'lucide-react';
import { CollegesTabProps, College } from '@/types/admin';
import DataView from './DataView';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';
import ResponsiveEntityList from './ResponsiveEntityList';

const CollegesTab: React.FC<CollegesTabProps> = ({
  colleges,
  loading,
  onAdd,
  onEdit,
  onDelete
}) => {
  if (loading) {
    return <LoadingState message="Loading colleges..." />;
  }

  if (!colleges.length) {
    return (
      <EmptyState
        title="No colleges found"
        description="Get started by creating your first college."
        action={
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700"
          >
            <PlusCircle size={16} />
            Add College
          </button>
        }
      />
    );
  }

  const columns = [
    { 
      key: 'college_name',
      header: 'Name' 
    },
    { 
      key: 'college_desc',
      header: 'Description' 
    }
  ];

  return (
    <DataView
      title="Colleges"
      description="Manage colleges in the system"
      addButtonText="Add College"
      onAdd={onAdd}
    >
      <ResponsiveEntityList<College>
        title="Colleges List"
        entities={colleges}
        columns={columns}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
        addButtonLabel="Add College"
        idField="college_id"
      />
    </DataView>
  );
};

export default CollegesTab;