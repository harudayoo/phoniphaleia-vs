import React, { useState } from 'react';
import { Edit, Trash } from 'lucide-react';
import NothingIcon from '@/components/NothingIcon';
import EntityDetailModal from './EntityDetailModal';
import { BaseEntity } from '@/types/admin';

interface Column {
  key: string;
  header: string;
}

export interface ResponsiveEntityListProps<T extends BaseEntity> {
  title: string;
  entities: T[];
  columns: Column[];
  onAdd: () => void;
  onEdit: (entity: T) => void;
  onDelete: (entity: T) => void;
  addButtonLabel: string;
  idField: string;
}

function ResponsiveEntityList<T extends BaseEntity>({
  title,
  entities,
  columns,
  onAdd,
  onEdit,
  onDelete,
  addButtonLabel,
  idField,
}: ResponsiveEntityListProps<T>) {
  const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleItemClick = (entity: T) => {
    setSelectedEntity(entity);
    setShowDetailModal(true);
  };

  const getEntityKey = (entity: T): string => {
    const idValue = entity[idField];
    return idValue !== undefined && idValue !== null ? String(idValue) : Math.random().toString(36);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-800">{title}</h2>
        <button 
          onClick={onAdd}
          className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
        >
          <span className="hidden md:inline">{addButtonLabel}</span>
          <span className="md:hidden">Add</span>
        </button>
      </div>
      {/* Desktop view - Table */}
      <div className="hidden md:block bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th 
                  key={String(column.key)} 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entities.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <NothingIcon width={48} height={48} className="mb-2" />
                    <p className="text-gray-500">No items found. Create one to get started.</p>
                  </div>
                </td>
              </tr>
            ) : (
              entities.map((entity) => (
                <tr 
                  key={getEntityKey(entity)} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleItemClick(entity)}
                >
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {entity[column.key] !== undefined && entity[column.key] !== null ? String(entity[column.key]) : 'N/A'}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-4">
                      <button 
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(entity);
                        }}
                        type="button"
                        aria-label="Edit"
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(entity);
                        }}
                        type="button"
                        aria-label="Delete"
                      >
                        <Trash size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Mobile view - Card list */}
      <div className="md:hidden">
        {entities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <NothingIcon width={48} height={48} className="mb-2" />
            <p className="text-gray-500">No items found. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entities.map((entity) => (
              <div 
                key={getEntityKey(entity)} 
                className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div 
                    className="font-medium text-gray-900 flex-1 cursor-pointer"
                    onClick={() => handleItemClick(entity)}
                  >
                    {entity[columns[0]?.key] !== undefined && entity[columns[0]?.key] !== null ? String(entity[columns[0]?.key]) : 'N/A'}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className="p-1 text-blue-600"
                      onClick={() => onEdit(entity)}
                      type="button"
                      aria-label="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="p-1 text-red-600"
                      onClick={() => onDelete(entity)}
                      type="button"
                      aria-label="Delete"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
                {columns.length > 1 && (
                  <div 
                    className="text-sm text-gray-500 truncate cursor-pointer"
                    onClick={() => handleItemClick(entity)}
                  >
                    {entity[columns[1]?.key] !== undefined && entity[columns[1]?.key] !== null ? String(entity[columns[1]?.key]) : 'N/A'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Detail Modal for Mobile and Desktop */}
      <EntityDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        entity={selectedEntity}
        columns={columns}
        onEdit={() => {
          setShowDetailModal(false);
          if (selectedEntity) onEdit(selectedEntity);
        }}
        onDelete={() => {
          setShowDetailModal(false);
          if (selectedEntity) onDelete(selectedEntity);
        }}
      />
    </div>
  );
}

export default ResponsiveEntityList;