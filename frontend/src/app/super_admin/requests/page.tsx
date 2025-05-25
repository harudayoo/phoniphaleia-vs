'use client';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import { useState, useEffect, useCallback } from 'react';
import { Check, X, Eye, Clock, Calendar, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

interface PendingAdmin {
  pending_id: number;
  id_number: string;
  email: string;
  lastname: string;
  firstname: string;
  middlename?: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  notes?: string;
  full_name: string;
}

export default function RequestsPage() {  const [pendingAdmins, setPendingAdmins] = useState<PendingAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<PendingAdmin | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalConfirmModalOpen, setApprovalConfirmModalOpen] = useState(false);
  const [rejectionConfirmModalOpen, setRejectionConfirmModalOpen] = useState(false);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';  const fetchPendingAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('super_admin_token');
      
      const response = await fetch(`${API_URL}/super_admin/pending_admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        if (Array.isArray(data)) {
          setPendingAdmins(data);
        } else {
          console.error('API returned non-array data:', data);
          setPendingAdmins([]);
        }
      } else {
        console.error('Failed to fetch pending admin requests');
        setPendingAdmins([]);
      }
    } catch (error) {
      console.error('Error fetching pending admin requests:', error);
      setPendingAdmins([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);
  useEffect(() => {
    fetchPendingAdmins();
  }, [fetchPendingAdmins]);
  // Filter pending admins based on search term
  const filteredPendingAdmins = Array.isArray(pendingAdmins) ? pendingAdmins.filter(admin => 
    admin.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.id_number.includes(searchTerm)
  ) : [];

  const handleViewDetails = (admin: PendingAdmin) => {
    setSelectedRequest(admin);
    setModalOpen(true);
  };
  const handleOpenRejectionModal = (admin: PendingAdmin) => {
    setSelectedRequest(admin);
    setRejectionReason('');
    setRejectionModalOpen(true);
  };

  const handleOpenApprovalConfirmModal = (admin: PendingAdmin) => {
    setSelectedRequest(admin);
    setApprovalConfirmModalOpen(true);
  };

  const handleOpenRejectionConfirmModal = (admin: PendingAdmin) => {
    setSelectedRequest(admin);
    setRejectionConfirmModalOpen(true);
  };
  const handleApproveRequest = async (pendingId: number) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('super_admin_token');
      
      const response = await fetch(`${API_URL}/super_admin/pending_admins/${pendingId}/approve`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Close all modals
        setApprovalConfirmModalOpen(false);
        setModalOpen(false);
        // Refresh the pending admin list
        await fetchPendingAdmins();
      } else {
        console.error('Failed to approve admin request');
      }
    } catch (error) {
      console.error('Error approving admin request:', error);
    } finally {
      setActionLoading(false);
    }
  };
  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('super_admin_token');
      
      const response = await fetch(`${API_URL}/super_admin/pending_admins/${selectedRequest.pending_id}/reject`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: rejectionReason })
      });
      
      if (response.ok) {
        // Close all modals
        setRejectionModalOpen(false);
        setRejectionConfirmModalOpen(false);
        setModalOpen(false);
        // Refresh the pending admin list
        await fetchPendingAdmins();
      } else {
        console.error('Failed to reject admin request');
      }
    } catch (error) {
      console.error('Error rejecting admin request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedRequest) return;
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('super_admin_token');
      
      const response = await fetch(`${API_URL}/super_admin/pending_admins/${selectedRequest.pending_id}/reject`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: 'Request rejected by admin' })
      });
      
      if (response.ok) {
        // Close all modals
        setRejectionConfirmModalOpen(false);
        setModalOpen(false);
        // Refresh the pending admin list
        await fetchPendingAdmins();
      } else {
        console.error('Failed to reject admin request');
      }
    } catch (error) {
      console.error('Error rejecting admin request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Admin Requests</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Number</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      Loading admin requests...
                    </td>
                  </tr>
                ) : filteredPendingAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No pending admin requests
                    </td>
                  </tr>
                ) : (
                  filteredPendingAdmins.map((admin) => (
                    <tr key={admin.pending_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{admin.full_name}</div>
                            <div className="text-sm text-gray-500">{admin.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.id_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          admin.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : admin.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                        </span>
                      </td>                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDistanceToNow(new Date(admin.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button 
                            className="text-gray-600 hover:text-gray-900"
                            title="View Details"
                            onClick={() => handleViewDetails(admin)}
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          {admin.status === 'pending' && (
                            <>                              <button 
                                className="text-green-600 hover:text-green-900"
                                title="Approve Request"
                                onClick={() => handleOpenApprovalConfirmModal(admin)}
                                disabled={actionLoading}
                              >
                                <Check className="h-5 w-5" />
                              </button>
                              <button 
                                className="text-red-600 hover:text-red-900"
                                title="Reject Request"
                                onClick={() => handleOpenRejectionConfirmModal(admin)}
                                disabled={actionLoading}
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Admin Request Details Modal */}
      {modalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Admin Request Details</h2>
                <button 
                  onClick={() => setModalOpen(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-700">Full Name</p>
                    <p className="font-medium text-gray-500">{selectedRequest.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">ID Number</p>
                    <p className="font-medium text-gray-500">{selectedRequest.id_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Email</p>
                    <p className="font-medium text-gray-500">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Username</p>
                    <p className="font-medium text-gray-500">{selectedRequest.username}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Requested {formatDistanceToNow(new Date(selectedRequest.created_at), { addSuffix: true })}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>Created on {new Date(selectedRequest.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <p className="text-sm text-gray-500">Status</p>
                  <div className={`px-3 py-1 inline-flex items-center space-x-1 rounded-full text-sm ${
                    selectedRequest.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : selectedRequest.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedRequest.status === 'pending' && <Clock className="h-4 w-4" />}
                    {selectedRequest.status === 'approved' && <Check className="h-4 w-4" />}
                    {selectedRequest.status === 'rejected' && <X className="h-4 w-4" />}
                    <span>{selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}</span>
                  </div>
                </div>
                
                {selectedRequest.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="p-2 bg-gray-50 rounded border border-gray-200 text-sm">{selectedRequest.notes}</p>
                  </div>
                )}
              </div>
                {selectedRequest.status === 'pending' && (
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => handleOpenRejectionModal(selectedRequest)}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                    disabled={actionLoading}
                  >
                    Reject with Reason
                  </button>
                  <button
                    onClick={() => handleOpenRejectionConfirmModal(selectedRequest)}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                    disabled={actionLoading}
                  >
                    Quick Reject
                  </button>
                  <button
                    onClick={() => handleOpenApprovalConfirmModal(selectedRequest)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    disabled={actionLoading}
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectionModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Reject Admin Request</h2>
                <button 
                  onClick={() => setRejectionModalOpen(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="mb-4 text-gray-600">
                Please provide a reason for rejecting this admin request. This will be stored in the system.
              </p>
              
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                rows={4}
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setRejectionModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectRequest}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={actionLoading || !rejectionReason.trim()}
                >
                  {actionLoading ? 'Processing...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>      )}

      {/* Approval Confirmation Modal */}
      {approvalConfirmModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Confirm Approval</h2>
                <button 
                  onClick={() => setApprovalConfirmModalOpen(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  Are you sure you want to approve the admin request for:
                </p>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="font-medium text-gray-800">{selectedRequest.full_name}</p>
                  <p className="text-sm text-gray-600">{selectedRequest.email}</p>
                  <p className="text-sm text-gray-600">Username: {selectedRequest.username}</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                This action will grant the user admin privileges and cannot be easily undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setApprovalConfirmModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApproveRequest(selectedRequest.pending_id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Approving...' : 'Approve Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Confirmation Modal */}
      {rejectionConfirmModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Confirm Rejection</h2>
                <button 
                  onClick={() => setRejectionConfirmModalOpen(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  Are you sure you want to reject the admin request for:
                </p>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="font-medium text-gray-800">{selectedRequest.full_name}</p>
                  <p className="text-sm text-gray-600">{selectedRequest.email}</p>
                  <p className="text-sm text-gray-600">Username: {selectedRequest.username}</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                This will reject the request without providing a detailed reason.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setRejectionConfirmModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
