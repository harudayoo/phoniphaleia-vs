import React from 'react';
import { PlusCircle } from 'lucide-react';
import { OrganizationsTabProps, Organization } from '@/types/admin';
import DataView from './DataView';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';
import ResponsiveEntityList from './ResponsiveEntityList';

const OrganizationsTab: React.FC<OrganizationsTabProps> = ({
  organizations,
  loading,
  onAdd,
  onEdit,
  onDelete
}) => {
  if (loading) {
    return <LoadingState message="Loading organizations..." />;
  }

  if (!organizations.length) {
    return (
      <EmptyState
        title="No organizations found"
        description="Get started by creating your first organization."
        action={
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700"
          >
            <PlusCircle size={16} />
            Add Organization
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
      key: 'college_name',
      header: 'College' 
    },
    { 
      key: 'description',
      header: 'Description' 
    }
  ];

  return (
    <DataView
      title="Organizations"
      description="Manage organizations in the system"
      addButtonText="Add Organization"
      onAdd={onAdd}
    >
      <ResponsiveEntityList<Organization>
        entities={organizations}
        columns={columns}
        onEdit={onEdit}
        onDelete={onDelete}
        idField="id"
      />
    </DataView>
  );
};

export default OrganizationsTab;