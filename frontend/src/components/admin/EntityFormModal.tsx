import React from 'react';
import Modal from '@/components/Modal';
import { UseFormRegister, FieldErrors, Path, FieldValues } from 'react-hook-form';

export interface FormField<T> {
  name: Path<T>;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select';
  required?: boolean;
  options?: { value: string | number; label: string }[];
  min?: number;
  placeholder?: string;
}

export interface EntityFormModalProps<T extends FieldValues> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: FormField<T>[];
  onSubmit: () => void;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  isEdit?: boolean;
}

const EntityFormModal = <T extends FieldValues>({
  isOpen,
  onClose,
  title,
  fields,
  onSubmit,
  register,
  errors,
  isEdit = false
}: EntityFormModalProps<T>) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md mr-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="entity-form"
            className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-md"
          >
            {isEdit ? 'Update' : 'Save'}
          </button>
        </>
      }
    >
      <form className="space-y-4" id="entity-form" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
        {fields.map((field) => (
          <div key={String(field.name)}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-600">*</span>}
            </label>
            {field.type === 'text' && (
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                {...register(field.name, { required: field.required ? `${field.label} is required` : false })}
              />
            )}
            {field.type === 'number' && (
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                {...register(field.name, {
                  required: field.required ? `${field.label} is required` : false,
                  min: field.min ? { value: field.min, message: `Must be at least ${field.min}` } : undefined,
                  valueAsNumber: true
                })}
              />
            )}
            {field.type === 'textarea' && (
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                {...register(field.name, { required: field.required ? `${field.label} is required` : false })}
              ></textarea>
            )}
            {field.type === 'select' && field.options && (
              <div className="relative">
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  {...register(field.name, { required: field.required ? `${field.label} is required` : false })}
                >
                  {!isEdit && <option value="" disabled>Select {field.label}</option>}
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {/* Dropdown arrow */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
            {errors[field.name] && (
              <p className="mt-1 text-sm text-red-600">
                {String(errors[field.name]?.message || '')}
              </p>
            )}
          </div>
        ))}
      </form>
    </Modal>
  );
};

export default EntityFormModal;