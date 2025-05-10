'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import AdminLayout from '@/layouts/AdminLayout';
import PageHeader from '@/components/admin/PageHeader';
import Modal from '@/components/Modal';
import { Plus, Edit, Trash, AlertCircle } from 'lucide-react';
import axios from 'axios';

// Updated interface to match the backend model
interface College {
  college_id: number;
  college_name: string;
  college_desc?: string;
  created_at?: string;
  updated_at?: string;
  // Frontend-only fields for display
  abbreviation?: string;
}

// Update the existing interfaces to match the API response
interface Organization {
  id: number;
  name: string;
  college_id: number;
  college_name: string;
  description?: string;
  created_at: string;
}

interface Position {
  id: number;
  name: string;
  organization_id: number;
  organization_name: string;
  max_candidates: number;
  description?: string;
  created_at: string;
}

interface CollegeFormData {
  college_name: string;
  college_desc?: string;
  abbreviation?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AdminEntriesPage() {
  const [activeTab, setActiveTab] = useState<'colleges' | 'organizations' | 'positions'>('colleges');
  const [colleges, setColleges] = useState<College[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showAddCollegeModal, setShowAddCollegeModal] = useState(false);
  const [showEditCollegeModal, setShowEditCollegeModal] = useState(false);
  const [showDeleteCollegeModal, setShowDeleteCollegeModal] = useState(false);
  const [showAddOrganizationModal, setShowAddOrganizationModal] = useState(false);
  const [showAddPositionModal, setShowAddPositionModal] = useState(false);
  
  // Selected college for edit/delete operations
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);

  // Form handling for college
  const { 
    register: registerAddCollege, 
    handleSubmit: handleSubmitAddCollege, 
    reset: resetAddCollegeForm,
    formState: { errors: addCollegeErrors }
  } = useForm<CollegeFormData>();

  const { 
    register: registerEditCollege, 
    handleSubmit: handleSubmitEditCollege, 
    reset: resetEditCollegeForm,
    setValue: setEditCollegeValue,
    formState: { errors: editCollegeErrors }
  } = useForm<CollegeFormData>();

  // Fetch colleges from API
  const fetchColleges = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/colleges`);
      setColleges(response.data);
    } catch (err) {
      console.error('Error fetching colleges:', err);
      setError('Failed to load colleges. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add these functions to fetch data from API
  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/organizations`);
      setOrganizations(response.data);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPositions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/positions`);
      setPositions(response.data);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError('Failed to load positions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add new college
  const addCollege = async (data: CollegeFormData) => {
    try {
      setLoading(true);
      setError(null);
      await axios.post(`${API_URL}/colleges`, data);
      await fetchColleges(); // Refresh the list
      setShowAddCollegeModal(false);
      resetAddCollegeForm();
    } catch (err) {
      console.error('Error adding college:', err);
      setError('Failed to add college. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Edit college
  const editCollege = async (data: CollegeFormData) => {
    if (!selectedCollege) return;
    
    try {
      setLoading(true);
      setError(null);
      await axios.put(`${API_URL}/colleges/${selectedCollege.college_id}`, data);
      await fetchColleges(); // Refresh the list
      setShowEditCollegeModal(false);
      resetEditCollegeForm();
      setSelectedCollege(null);
    } catch (err) {
      console.error('Error updating college:', err);
      setError('Failed to update college. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete college
  const deleteCollege = async () => {
    if (!selectedCollege) return;
    
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`${API_URL}/colleges/${selectedCollege.college_id}`);
      await fetchColleges(); // Refresh the list
      setShowDeleteCollegeModal(false);
      setSelectedCollege(null);
    } catch (err) {
      console.error('Error deleting college:', err);
      setError('Failed to delete college. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal and populate form
  const handleEditCollege = (college: College) => {
    setSelectedCollege(college);
    setEditCollegeValue('college_name', college.college_name);
    setEditCollegeValue('college_desc', college.college_desc || '');
    setEditCollegeValue('abbreviation', college.abbreviation || '');
    setShowEditCollegeModal(true);
  };

  // Open delete confirmation modal
  const handleDeleteCollege = (college: College) => {
    setSelectedCollege(college);
    setShowDeleteCollegeModal(true);
  };

  // Update the useEffect hook to call the appropriate fetch function based on active tab
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

        <div className="p-6">
          {activeTab === 'colleges' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-800">College List</h2>
                <button 
                  onClick={() => {
                    resetAddCollegeForm();
                    setShowAddCollegeModal(true);
                  }}
                  className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add New College
                </button>
              </div>
              
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-4">
                          <div className="animate-pulse flex space-x-4">
                            <div className="flex-1 space-y-6 py-1">
                              <div className="h-2 bg-gray-200 rounded"></div>
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="h-2 bg-gray-200 rounded col-span-2"></div>
                                  <div className="h-2 bg-gray-200 rounded col-span-1"></div>
                                </div>
                                <div className="h-2 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : colleges.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-gray-500">No colleges found. Create one to get started.</td>
                      </tr>
                    ) : (
                      colleges.map((college) => (
                        <tr key={college.college_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{college.college_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              className="text-blue-600 hover:text-blue-900 mr-4 flex items-center gap-1"
                              onClick={() => handleEditCollege(college)}
                            >
                              <Edit size={14} /> Edit
                            </button>
                            <button 
                              className="text-red-600 hover:text-red-900 flex items-center gap-1"
                              onClick={() => handleDeleteCollege(college)}
                            >
                              <Trash size={14} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Organizations and Positions tabs remain unchanged */}
          {activeTab === 'organizations' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-800">Organization List</h2>
                <button 
                  onClick={() => setShowAddOrganizationModal(true)}
                  className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add New Organization
                </button>
              </div>
              
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4">
                          <div className="animate-pulse flex space-x-4">
                            <div className="flex-1 space-y-6 py-1">
                              <div className="h-2 bg-gray-200 rounded"></div>
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="h-2 bg-gray-200 rounded col-span-2"></div>
                                  <div className="h-2 bg-gray-200 rounded col-span-1"></div>
                                </div>
                                <div className="h-2 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : organizations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No organizations found. Create one to get started.</td>
                      </tr>
                    ) : (
                      organizations.map((org) => (
                        <tr key={org.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{org.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.college_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{org.description || 'No description'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(org.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-4 flex items-center gap-1">
                              <Edit size={14} /> Edit
                            </button>
                            <button className="text-red-600 hover:text-red-900 flex items-center gap-1">
                              <Trash size={14} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'positions' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-800">Position List</h2>
                <button 
                  onClick={() => setShowAddPositionModal(true)}
                  className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add New Position
                </button>
              </div>
              
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Candidates</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4">
                          <div className="animate-pulse flex space-x-4">
                            <div className="flex-1 space-y-6 py-1">
                              <div className="h-2 bg-gray-200 rounded"></div>
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="h-2 bg-gray-200 rounded col-span-2"></div>
                                  <div className="h-2 bg-gray-200 rounded col-span-1"></div>
                                </div>
                                <div className="h-2 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : positions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No positions found. Create one to get started.</td>
                      </tr>
                    ) : (
                      positions.map((position) => (
                        <tr key={position.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{position.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.organization_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.max_candidates}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{position.description || 'No description'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(position.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-4 flex items-center gap-1">
                              <Edit size={14} /> Edit
                            </button>
                            <button className="text-red-600 hover:text-red-900 flex items-center gap-1">
                              <Trash size={14} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add College Modal */}
      <Modal
        isOpen={showAddCollegeModal}
        onClose={() => setShowAddCollegeModal(false)}
        title="Add New College"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddCollegeModal(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md mr-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitAddCollege(addCollege)}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-md"
            >
              Save College
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              College Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter college name"
              {...registerAddCollege('college_name', { required: 'College name is required' })}
            />
            {addCollegeErrors.college_name && (
              <p className="mt-1 text-sm text-red-600">{addCollegeErrors.college_name?.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
              placeholder="Enter college description"
              {...registerAddCollege('college_desc')}
            ></textarea>
          </div>
        </form>
      </Modal>

      {/* Edit College Modal */}
      <Modal
        isOpen={showEditCollegeModal}
        onClose={() => setShowEditCollegeModal(false)}
        title="Edit College"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowEditCollegeModal(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md mr-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitEditCollege(editCollege)}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-md"
            >
              Update College
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              College Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter college name"
              {...registerEditCollege('college_name', { required: 'College name is required' })}
            />
            {editCollegeErrors.college_name && (
              <p className="mt-1 text-sm text-red-600">{editCollegeErrors.college_name?.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
              placeholder="Enter college description"
              {...registerEditCollege('college_desc')}
            ></textarea>
          </div>
        </form>
      </Modal>

      {/* Delete College Modal */}
      <Modal
        isOpen={showDeleteCollegeModal}
        onClose={() => setShowDeleteCollegeModal(false)}
        title="Delete College"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowDeleteCollegeModal(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md mr-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={deleteCollege}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
            >
              Delete
            </button>
          </>
        }
      >
        <div className="text-center">
          <p className="text-gray-700 mb-2">
            Are you sure you want to delete the college &quot;{selectedCollege?.college_name}&quot;?
          </p>
          <p className="text-gray-500 text-sm">
            This action cannot be undone. All associated organizations and positions will also be deleted.
          </p>
        </div>
      </Modal>

      {/* Existing modals for organizations and positions */}
      <Modal
        isOpen={showAddOrganizationModal}
        onClose={() => setShowAddOrganizationModal(false)}
        title="Add New Organization"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddOrganizationModal(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-md"
            >
              Save Organization
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter organization name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              College
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select a college</option>
              {colleges.map((college) => (
                <option key={college.college_id} value={college.college_id}>{college.college_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
              placeholder="Enter organization description"
            ></textarea>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showAddPositionModal}
        onClose={() => setShowAddPositionModal(false)}
        title="Add New Position"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddPositionModal(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-md"
            >
              Save Position
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter position name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select an organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Number of Candidates
            </label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter max candidates"
              defaultValue={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
              placeholder="Enter position description"
            ></textarea>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
