'use client';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import { useState, useEffect, useCallback } from 'react';
import { Eye, Trash2, Search, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

interface Admin {
  admin_id: number;
  id_number: string;
  email: string;
  lastname: string;
  firstname: string;
  middlename?: string;
  username: string;
  role: string;
  created_at: string;
  last_login: string | null;
  full_name: string;
}

export default function AdminsPage() {  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('super_admin_token');
      
      const response = await fetch(`${API_URL}/super_admin/admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
        if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setAdmins(data);
        } else if (data.admins && Array.isArray(data.admins)) {
          setAdmins(data.admins);
        } else {
          console.error('Received invalid admins data format:', data);
          setAdmins([]);
        }
      } else {
        console.error('Failed to fetch admins');
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Filter admins based on search term
  const filteredAdmins = admins.filter(admin => 
    admin.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.id_number.includes(searchTerm)
  );  const handleViewAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setShowAdminModal(true);
  };  const handleOpenDeleteConfirmModal = (admin: Admin) => {
    setAdminToDelete(admin);
    setDeleteConfirmModalOpen(true);
  };

  const handleCloseDeleteConfirmModal = () => {
    setDeleteConfirmModalOpen(false);
    setAdminToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!adminToDelete) return;
    
    try {
      setDeleteLoading(true);
      const token = localStorage.getItem('super_admin_token');
      
      const response = await fetch(`${API_URL}/super_admin/admins/${adminToDelete.admin_id}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
        if (response.ok) {
        // Close the confirmation modal
        handleCloseDeleteConfirmModal();
        // Refresh the admin list
        fetchAdmins();
      } else {
        console.error('Failed to delete admin');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Administrators</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search admins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Number</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      Loading admins...
                    </td>
                  </tr>
                ) : filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No administrators found
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr key={admin.admin_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{admin.full_name}</div>
                            <div className="text-sm text-gray-500">{admin.email}</div>
                          </div>
                        </div>
                      </td>                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.id_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {admin.last_login ? formatDistanceToNow(new Date(admin.last_login), { addSuffix: true }) : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button 
                            className="text-gray-600 hover:text-gray-900"
                            title="View Admin Details"
                            onClick={() => handleViewAdmin(admin)}
                          >
                            <Eye className="h-5 w-5" />
                          </button>                          <button 
                            className="text-red-600 hover:text-red-900"
                            title="Delete Admin"
                            onClick={() => handleOpenDeleteConfirmModal(admin)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>          </div>
        </div>
      </div>

      {/* Admin Details Modal */}
      {showAdminModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <p className="text-sm text-gray-900">{selectedAdmin.full_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedAdmin.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <p className="text-sm text-gray-900">{selectedAdmin.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Number</label>
                  <p className="text-sm text-gray-900">{selectedAdmin.id_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="text-sm text-gray-900">{selectedAdmin.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created At</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedAdmin.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Login</label>
                  <p className="text-sm text-gray-900">
                    {selectedAdmin.last_login 
                      ? formatDistanceToNow(new Date(selectedAdmin.last_login), { addSuffix: true }) 
                      : 'Never'}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModalOpen && adminToDelete && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Confirm Delete Admin</h2>                <button 
                  onClick={handleCloseDeleteConfirmModal} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  Are you sure you want to delete this administrator?
                </p>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="font-medium text-gray-800">{adminToDelete.full_name}</p>
                  <p className="text-sm text-gray-600">{adminToDelete.email}</p>
                  <p className="text-sm text-gray-600">Username: {adminToDelete.username}</p>
                  <p className="text-sm text-gray-600">ID: {adminToDelete.id_number}</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Warning: This action cannot be undone
                    </h3>
                    <div className="mt-1 text-sm text-red-700">
                      <p>Deleting this admin will permanently remove their access and cannot be reversed.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">                <button
                  onClick={handleCloseDeleteConfirmModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Admin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}

