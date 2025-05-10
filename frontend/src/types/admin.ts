// Entity Interfaces
export interface BaseEntity {
  [key: string]: string | number | boolean | undefined | null;
}

export interface College extends BaseEntity {
  college_id: number;
  college_name: string;
  college_desc?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Organization extends BaseEntity {
  id: number;
  name: string;
  college_id: number;
  college_name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface Position extends BaseEntity {
  id: number;
  name: string;
  organization_id: number;
  organization_name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// Form Data Interfaces
export interface CollegeFormData {
  college_name: string;
  college_desc?: string;
}

export interface OrganizationFormData {
  name: string;
  college_id: number;
  description?: string;
}

export interface PositionFormData {
  name: string;
  organization_id: number;
  description?: string;
}

// FormField generic for use in admin components
export interface FormField<T> {
  name: keyof T;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select';
  required?: boolean;
  options?: { value: string | number; label: string }[];
  min?: number;
  placeholder?: string;
}

// Component Props Interfaces
export interface CollegesTabProps {
  colleges: College[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (college: College) => void;
  onDelete: (college: College) => void;
}

export interface OrganizationsTabProps {
  organizations: Organization[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (organization: Organization) => void;
  onDelete: (organization: Organization) => void;
}

export interface PositionsTabProps {
  positions: Position[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (position: Position) => void;
  onDelete: (position: Position) => void;
}