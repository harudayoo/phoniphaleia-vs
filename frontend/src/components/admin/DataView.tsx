import React, { ReactNode } from 'react';
import { PlusCircle } from 'lucide-react';

interface DataViewProps {
  title: string;
  description: string;
  children: ReactNode;
  addButtonText: string;
  onAdd: () => void;
}

const DataView: React.FC<DataViewProps> = ({
  title,
  description,
  children,
  addButtonText,
  onAdd
}) => {
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <button
          onClick={onAdd}
          className="mt-3 md:mt-0 inline-flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700"
        >
          <PlusCircle size={16} />
          {addButtonText}
        </button>
      </div>
      {children}
    </div>
  );
};

export default DataView;