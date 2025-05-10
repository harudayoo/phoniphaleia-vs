import React from 'react';
import Modal from '@/components/Modal';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  title: string;
  entityName: string;
  warningMessage?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  title,
  entityName,
  warningMessage
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md mr-3"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            Delete
          </button>
        </>
      }
    >
      <div className="text-center">
        <p className="text-gray-700 mb-2">
          Are you sure you want to delete &quot;{entityName}&quot;?
        </p>
        {warningMessage && (
          <p className="text-gray-800 text-sm">{warningMessage}</p>
        )}
      </div>
    </Modal>
  );
};

export default DeleteConfirmationModal;