import React from 'react';
import Modal from '@/components/Modal';
import { Edit, Trash } from 'lucide-react';
import { BaseEntity } from '@/types/admin';

interface EntityDetailModalProps<T extends BaseEntity> {
  isOpen: boolean;
  onClose: () => void;
  entity: T | null;
  columns: {
    key: string;
    header: string;
    render?: (entity: T) => React.ReactNode;
  }[];
  onEdit: () => void;
  onDelete: () => void;
}

const EntityDetailModal = <T extends BaseEntity>({
  isOpen,
  onClose,
  entity,
  columns,
  onEdit,
  onDelete,
}: EntityDetailModalProps<T>) => {
  if (!entity) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Details"
      size="sm"
    >
      <div className="space-y-4">
        {columns.map((column) => (
          <div key={column.key}>
            <h3 className="text-sm font-medium text-gray-500">{column.header}</h3>
            <div className="mt-1 text-base text-gray-900">
              {column.render 
                ? column.render(entity) 
                : (entity[column.key] === null || entity[column.key] === undefined 
                    ? 'N/A' 
                    : String(entity[column.key])
                  )
              }
            </div>
          </div>
        ))}
        
        <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-4">
          <button
            onClick={onEdit}
            className="px-3 py-2 bg-blue-50 text-blue-700 rounded-md flex items-center gap-1"
          >
            <Edit size={16} /> Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 bg-red-50 text-red-700 rounded-md flex items-center gap-1"
          >
            <Trash size={16} /> Delete
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EntityDetailModal;