'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import AdminLayout from '@/layouts/AdminLayout';
import PageHeader from '@/components/admin/PageHeader';
import { AlertCircle } from 'lucide-react';
import axios from 'axios';

// Import our components and types
import CollegesTab from '@/components/admin/CollegesTab';
import OrganizationsTab from '@/components/admin/OrganizationsTab';
import PositionsTab from '@/components/admin/PositionsTab';
import EntityFormModal from '@/components/admin/EntityFormModal';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';
import { 
  College, 
  Organization, 
  Position, 
  CollegeFormData, 
  OrganizationFormData, 
  PositionFormData 
} from '@/types/admin';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AdminEntriesPage() {
  const [activeTab, setActiveTab] = useState<'colleges' | 'organizations' | 'positions'>('colleges');
  const [colleges, setColleges] = useState<College[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  
  // Selected items - now properly typed
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  // Form hooks for each entity type
  const collegeForm = useForm<CollegeFormData>();
  const organizationForm = useForm<OrganizationFormData>();
  const positionForm = useForm<PositionFormData>();

  // Strictly typed form fields for each entity type
  const collegeFields = [
    { name: 'college_name' as const, label: 'College Name', type: 'text' as const, required: true },
    { name: 'college_desc' as const, label: 'Description', type: 'textarea' as const }
  ];

  const organizationFields = [
    { name: 'name' as const, label: 'Organization Name', type: 'text' as const, required: true },
    {
      name: 'college_id' as const,
      label: 'College',
      type: 'select' as const,
      required: true,
      options: colleges.map(c => ({ value: c.college_id, label: c.college_name }))
    },
    { name: 'description' as const, label: 'Description', type: 'textarea' as const }
  ];

  const positionFields = [
    { name: 'name' as const, label: 'Position Name', type: 'text' as const, required: true },
    {
      name: 'organization_id' as const,
      label: 'Organization',
      type: 'select' as const,
      required: true,
      options: organizations.map(o => {
        const college = colleges.find(c => c.college_id === o.college_id);
        return {
          value: o.id,
          label: college ? `${o.name} (${college.college_name})` : o.name
        };
      })
    },
    { name: 'description' as const, label: 'Description', type: 'textarea' as const }
  ];

  // Fetch functions
  const fetchColleges = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<College[]>(`${API_URL}/colleges`);
      setColleges(response.data);
    } catch (err) {
      console.error('Error fetching colleges:', err);
      setError('Failed to load colleges. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<Organization[]>(`${API_URL}/organizations`);
      setOrganizations(response.data);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPositions = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<Position[]>(`${API_URL}/positions`);
      setPositions(response.data);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError('Failed to load positions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // CRUD operations
  const handleAdd = async (data: CollegeFormData | OrganizationFormData | PositionFormData): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      if (activeTab === 'colleges') {
        await axios.post(`${API_URL}/colleges`, data as CollegeFormData);
        await fetchColleges();
      } else if (activeTab === 'organizations') {
        await axios.post(`${API_URL}/organizations`, data as OrganizationFormData);
        await fetchOrganizations();
      } else if (activeTab === 'positions') {
        await axios.post(`${API_URL}/positions`, data as PositionFormData);
        await fetchPositions();
      }
      
      setShowAddModal(false);
      
      // Reset the appropriate form
      if (activeTab === 'colleges') collegeForm.reset();
      else if (activeTab === 'organizations') organizationForm.reset();
      else if (activeTab === 'positions') positionForm.reset();
    } catch (err) {
      console.error(`Error adding ${activeTab.slice(0, -1)}:`, err);
      setError(`Failed to add ${activeTab.slice(0, -1)}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (data: CollegeFormData | OrganizationFormData | PositionFormData): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      if (activeTab === 'colleges' && selectedCollege) {
        await axios.put(`${API_URL}/colleges/${selectedCollege.college_id}`, data as CollegeFormData);
        await fetchColleges();
      } else if (activeTab === 'organizations' && selectedOrganization) {
        await axios.put(`${API_URL}/organizations/${selectedOrganization.id}`, data as OrganizationFormData);
        await fetchOrganizations();
      } else if (activeTab === 'positions' && selectedPosition) {
        // Always send description as a string, never undefined
        const positionPayload = {
          name: (data as PositionFormData).name,
          organization_id: (data as PositionFormData).organization_id,
          description: typeof (data as PositionFormData).description === 'string' ? (data as PositionFormData).description : '',
        };
        await axios.put(`${API_URL}/positions/${selectedPosition.id}`, positionPayload);
        await fetchPositions();
      }
      
      setShowEditModal(false);
      
      // Reset selected item and form
      if (activeTab === 'colleges') {
        setSelectedCollege(null);
        collegeForm.reset();
      } else if (activeTab === 'organizations') {
        setSelectedOrganization(null);
        organizationForm.reset();
      } else if (activeTab === 'positions') {
        setSelectedPosition(null);
        positionForm.reset();
      }
    } catch (err) {
      console.error(`Error updating ${activeTab.slice(0, -1)}:`, err);
      setError(`Failed to update ${activeTab.slice(0, -1)}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      if (activeTab === 'colleges' && selectedCollege) {
        await axios.delete(`${API_URL}/colleges/${selectedCollege.college_id}`);
        await fetchColleges();
      } else if (activeTab === 'organizations' && selectedOrganization) {
        await axios.delete(`${API_URL}/organizations/${selectedOrganization.id}`);
        await fetchOrganizations();
      } else if (activeTab === 'positions' && selectedPosition) {
        await axios.delete(`${API_URL}/positions/${selectedPosition.id}`);
        await fetchPositions();
      }
      
      setShowDeleteModal(false);
      
      // Reset selected item
      if (activeTab === 'colleges') setSelectedCollege(null);
      else if (activeTab === 'organizations') setSelectedOrganization(null);
      else if (activeTab === 'positions') setSelectedPosition(null);
    } catch (err) {
      console.error(`Error deleting ${activeTab.slice(0, -1)}:`, err);
      setError(`Failed to delete ${activeTab.slice(0, -1)}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Handler functions for opening modals
  const openAddModal = () => {
    if (activeTab === 'colleges') collegeForm.reset();
    else if (activeTab === 'organizations') organizationForm.reset();
    else if (activeTab === 'positions') positionForm.reset();
    
    setShowAddModal(true);
  };

  const openEditModal = (item: College | Organization | Position) => {
    if (activeTab === 'colleges') {
      const college = item as College;
      setSelectedCollege(college);
      collegeForm.setValue('college_name', college.college_name);
      collegeForm.setValue('college_desc', college.college_desc || '');
    } else if (activeTab === 'organizations') {
      const org = item as Organization;
      setSelectedOrganization(org);
      organizationForm.setValue('name', org.name);
      organizationForm.setValue('college_id', org.college_id);
      organizationForm.setValue('description', org.description || '');
    } else if (activeTab === 'positions') {
      const position = item as Position;
      setSelectedPosition(position);
      positionForm.setValue('name', position.name);
      positionForm.setValue('organization_id', position.organization_id);
      positionForm.setValue('description', position.description || '');
    }
    
    setShowEditModal(true);
  };

  const openDeleteModal = (item: College | Organization | Position) => {
    if (activeTab === 'colleges') setSelectedCollege(item as College);
    else if (activeTab === 'organizations') setSelectedOrganization(item as Organization);
    else if (activeTab === 'positions') setSelectedPosition(item as Position);
    
    setShowDeleteModal(true);
  };

  // Get entity name for delete confirmation
  const getEntityName = () => {
    if (activeTab === 'colleges' && selectedCollege) return selectedCollege.college_name;
    else if (activeTab === 'organizations' && selectedOrganization) return selectedOrganization.name;
    else if (activeTab === 'positions' && selectedPosition) return selectedPosition.name;
    return '';
  };

  // Get warning message for delete confirmation
  const getDeleteWarningMessage = () => {
    if (activeTab === 'colleges') {
      return 'This action cannot be undone. All associated organizations and positions will also be deleted.';
    } else if (activeTab === 'organizations') {
      return 'This action cannot be undone. All associated positions will also be deleted.';
    } else {
      return 'This action cannot be undone.';
    }
  };

  useEffect(() => {
    if (activeTab === 'colleges') {
      fetchColleges();
    } else if (activeTab === 'organizations') {
      fetchOrganizations();
    } else if (activeTab === 'positions') {
      fetchPositions();
    }
  }, [activeTab]);

  return (
    <AdminLayout>
      <PageHeader 
        title="Organizations and Positions" 
        description="Manage colleges, organizations, and positions for elections."
      />

      {/* Display error message if any */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200 mb-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 px-4 flex overflow-x-auto">
          <button
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'colleges'
                ? 'text-red-800 border-b-2 border-red-800'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('colleges')}
          >
            Colleges
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'organizations'
                ? 'text-red-800 border-b-2 border-red-800'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('organizations')}
          >
            Organizations
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'positions'
                ? 'text-red-800 border-b-2 border-red-800'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('positions')}
          >
            Positions
          </button>
        </div>

        <div className="p-4 md:p-6">
          {activeTab === 'colleges' && (
            <CollegesTab 
              colleges={colleges}
              loading={loading}
              onAdd={openAddModal}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
          )}

          {activeTab === 'organizations' && (
            <OrganizationsTab 
              organizations={organizations}
              loading={loading}
              onAdd={openAddModal}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
          )}

          {activeTab === 'positions' && (
            <PositionsTab 
              positions={positions}
              loading={loading}
              onAdd={openAddModal}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
          )}
        </div>
      </div>

      {/* Strictly typed Add/Edit Modals for each entity type */}
      {activeTab === 'colleges' && (
        <EntityFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New College"
          fields={collegeFields}
          onSubmit={collegeForm.handleSubmit(handleAdd)}
          register={collegeForm.register}
          errors={collegeForm.formState.errors}
          isEdit={false}
        />
      )}
      {activeTab === 'organizations' && (
        <EntityFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Organization"
          fields={organizationFields}
          onSubmit={organizationForm.handleSubmit(handleAdd)}
          register={organizationForm.register}
          errors={organizationForm.formState.errors}
          isEdit={false}
        />
      )}
      {activeTab === 'positions' && (
        <EntityFormModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Position"
          fields={positionFields}
          onSubmit={positionForm.handleSubmit(handleAdd)}
          register={positionForm.register}
          errors={positionForm.formState.errors}
          isEdit={false}
        />
      )}
      {activeTab === 'colleges' && (
        <EntityFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit College"
          fields={collegeFields}
          onSubmit={collegeForm.handleSubmit(handleEdit)}
          register={collegeForm.register}
          errors={collegeForm.formState.errors}
          isEdit={true}
        />
      )}
      {activeTab === 'organizations' && (
        <EntityFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Organization"
          fields={organizationFields}
          onSubmit={organizationForm.handleSubmit(handleEdit)}
          register={organizationForm.register}
          errors={organizationForm.formState.errors}
          isEdit={true}
        />
      )}
      {activeTab === 'positions' && (
        <EntityFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Position"
          fields={positionFields}
          onSubmit={positionForm.handleSubmit(handleEdit)}
          register={positionForm.register}
          errors={positionForm.formState.errors}
          isEdit={true}
        />
      )}

      {/* Unified Delete Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDelete={handleDelete}
        title={`Delete ${activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}`}
        entityName={getEntityName()}
        warningMessage={getDeleteWarningMessage()}
      />
    </AdminLayout>
  );
}
