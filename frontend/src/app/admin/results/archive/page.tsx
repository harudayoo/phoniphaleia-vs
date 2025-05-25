'use client';
import { useEffect, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaEye, FaTrash, FaRecycle } from 'react-icons/fa';
import { Calendar, ArrowUp } from 'lucide-react';

// Import reusable components
import PageHeader from '@/components/admin/PageHeader';
import SearchFilterBar from '@/components/admin/SearchFilterBar';
import FilterSelect from '@/components/admin/FilterSelect';
import Loader4 from '@/components/Loader4';
import NothingIcon from '@/components/NothingIcon';
import { authenticatedFetch } from '@/services/apiService';

type ArchivedResult = {
  archive_id: number;
  result_id: number;
  election_id: number;
  election_name: string;
  organization?: string;
  archived_at: string;
  result_count?: number;
  can_delete: boolean;
};

type ArchivedResultDetail = {
  archive_id: number;
  result_id: number;
  candidate_id: number;
  candidate_name: string;
  position_name: string;
  vote_count: number;
  created_at: string;
  archived_at: string;
  can_delete: boolean;
};

interface ElectionDetails {
  election_id: number;
  election_name: string;
  organization: string;
  archived_results: ArchivedResultDetail[];
}

const sortOptions = [
  { value: 'date_desc', label: 'Date Archived (Newest)' },
  { value: 'date_asc', label: 'Date Archived (Oldest)' },
  { value: 'name_asc', label: 'Election Name (A-Z)' },
  { value: 'name_desc', label: 'Election Name (Z-A)' },
];

export default function AdminArchivedResultsPage() {
  const [archivedResults, setArchivedResults] = useState<ArchivedResult[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [loading, setLoading] = useState(true);  const [swinnerElection, setSwinnerElection] = useState<ElectionDetails | null>(null);
  const [showModal, setShowModal] = useState<'restore' | 'delete' | null>(null);
  const [swinnerElectionId, setSwinnerElectionId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteCountdown, setDeleteCountdown] = useState(10);

  // Countdown effect for delete confirmation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showModal === 'delete' && deleteCountdown > 0) {
      interval = setInterval(() => {
        setDeleteCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showModal, deleteCountdown]);

  // Reset countdown when modal opens
  useEffect(() => {
    if (showModal === 'delete') {
      setDeleteCountdown(10);
    }
  }, [showModal]);
  useEffect(() => {
    const fetchArchivedResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await authenticatedFetch('/archived_results');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch archived results (${res.status})`);
        }
        const data = await res.json();
        
        // Set the data to state
        setArchivedResults(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching archived results:", error);
        setError(error instanceof Error ? error.message : 'Failed to fetch archived results');
        setLoading(false);
      }
    };
    fetchArchivedResults();
  }, []);
  const fetchElectionDetails = async (electionId: number) => {
    try {
      setError(null);
      const res = await authenticatedFetch(`/archived_results/election/${electionId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch election details (${res.status})`);
      }
      const data = await res.json();
      setSwinnerElection(data);
    } catch (error) {
      console.error("Error fetching election details:", error);
      setError(error instanceof Error ? error.message : "Failed to load election details. Please try again.");
    }
  };  const handleRestoreElection = async (electionId: number) => {
    setError(null);
    setIsProcessing(true);
    try {
      // Get all archived results for this election
      const res = await authenticatedFetch(`/archived_results/election/${electionId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch election archived results');
      }
      const electionData = await res.json();
      
      // Restore each archived result
      let successCount = 0;
      for (const archivedResult of electionData.archived_results) {
        try {
          const restoreRes = await authenticatedFetch(`/archived_results/${archivedResult.archive_id}/restore`, { 
            method: 'POST'
          });
          if (restoreRes.ok) {
            successCount++;
          }
        } catch (err) {
          console.warn(`Failed to restore archive_id ${archivedResult.archive_id}:`, err);
        }
      }
      
      if (successCount > 0) {
        // Remove the election from the main archived results list
        setArchivedResults(prev => prev.filter(r => r.election_id !== electionId));
        setNotification(`Successfully restored ${successCount} result(s) from election to active results.`);
      } else {
        throw new Error('No results were restored successfully');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to restore election results.');
      } else {
        setError('Failed to restore election results.');
      }    } finally {
      setIsProcessing(false);
      setShowModal(null);
      setSwinnerElectionId(null);
    }
  };

  const handleDeleteElection = async (electionId: number) => {
    setError(null);
    setIsProcessing(true);
    try {
      // Get all archived results for this election
      const res = await authenticatedFetch(`/archived_results/election/${electionId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch election archived results');
      }
      const electionData = await res.json();
      
      // Delete each archived result
      let successCount = 0;
      for (const archivedResult of electionData.archived_results) {
        try {
          const deleteRes = await authenticatedFetch(`/archived_results/${archivedResult.archive_id}`, { 
            method: 'DELETE'
          });
          if (deleteRes.ok) {
            successCount++;
          }
        } catch (err) {
          console.warn(`Failed to delete archive_id ${archivedResult.archive_id}:`, err);
        }
      }
      
      if (successCount > 0) {
        // Remove the election from the main archived results list
        setArchivedResults(prev => prev.filter(r => r.election_id !== electionId));
        setNotification(`Successfully deleted ${successCount} archived result(s) permanently.`);
      } else {
        throw new Error('No results were deleted successfully');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to delete election archived results.');
      } else {        setError('Failed to delete election archived results.');
      }
    } finally {
      setIsProcessing(false);
      setShowModal(null);
      setSwinnerElectionId(null);
    }  };

  const filtered = archivedResults
    .filter(r => 
      r.election_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.organization || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === 'date_asc') return new Date(a.archived_at).getTime() - new Date(b.archived_at).getTime();
      if (sort === 'date_desc') return new Date(b.archived_at).getTime() - new Date(a.archived_at).getTime();
      if (sort === 'name_asc') return a.election_name.localeCompare(b.election_name);
      if (sort === 'name_desc') return b.election_name.localeCompare(a.election_name);
      return 0;
    });

  const renderGridItem = (result: ArchivedResult, key?: React.Key) => (
    <div key={key ?? result.archive_id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-200">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <span className="text-sm font-medium text-gray-600">{result.organization}</span>
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Archived</span>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-800 mb-3 line-clamp-2">{result.election_name}</h3>
        
        <div className="flex items-center mb-4 text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span>Archived: {new Date(result.archived_at).toLocaleDateString()}</span>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <div className="text-xs text-blue-700 mb-1 font-medium">Archived Results</div>
          <div className="font-semibold text-blue-800">{result.result_count} candidate results</div>
        </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <button 
            type="button" 
            className="px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center"
            onClick={() => fetchElectionDetails(result.election_id)}
          >
            <FaEye className="mr-2" size={14} />
            View Details
          </button>
          
          <div className="flex gap-2">            <button 
              type="button" 
              className="px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 rounded-lg transition-colors flex items-center"
              onClick={() => {
                setSwinnerElectionId(result.election_id);
                setShowModal('restore');
              }}
            >
              <FaRecycle className="mr-2" size={14} />
              Restore
            </button>
            
            <button 
              type="button" 
              className={`px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center ${
                result.can_delete ? '' : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => {
                if (result.can_delete) {
                  setSwinnerElectionId(result.election_id);
                  setShowModal('delete');
                }
              }}
              disabled={!result.can_delete}
              title={result.can_delete ? 'Delete permanently' : 'Cannot delete until retention period ends (1 year)'}
            >
              <FaTrash className="mr-2" size={14} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderListTable = () => (
    <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Election
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Organization
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Archived Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Results Count
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filtered.map((result) => (
            <tr key={result.archive_id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{result.election_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{result.organization}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{new Date(result.archived_at).toLocaleDateString()}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{result.result_count}</div>
              </td>              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button 
                  type="button" 
                  className="text-blue-600 hover:text-blue-900 mr-3"
                  onClick={() => fetchElectionDetails(result.election_id)}
                >
                  View Details
                </button>                <button 
                  type="button" 
                  className="text-green-600 hover:text-green-900 mr-3"
                  onClick={() => {
                    setSwinnerElectionId(result.election_id);
                    setShowModal('restore');
                  }}
                >
                  Restore
                </button>
                <button 
                  type="button" 
                  className={`text-red-600 hover:text-red-900 ${result.can_delete ? '' : 'opacity-50 cursor-not-allowed'}`}
                  onClick={() => {
                    if (result.can_delete) {
                      setSwinnerElectionId(result.election_id);
                      setShowModal('delete');
                    }
                  }}
                  disabled={!result.can_delete}
                  title={result.can_delete ? 'Delete permanently' : 'Cannot delete until retention period ends (1 year)'}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <AdminLayout>
      <PageHeader 
        title="Archived Results" 
        description="View and manage archived election results. You can restore results back to active or permanently delete them after the retention period."
      />

      <SearchFilterBar 
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by election name or organization..."
        view={view}
        onViewChange={setView}
      >
        <FilterSelect 
          value={sort}
          onChange={setSort}
          options={sortOptions}
          icon={ArrowUp}
        />
      </SearchFilterBar>      <div className="mb-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading archived results...</div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl shadow">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Error Loading Archived Results</h3>
            <p className="text-gray-500 mb-4 text-center max-w-md">{error}</p>
            <button 
              type="button"
              onClick={() => {
                setError(null);
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl shadow">
            <NothingIcon width={80} height={80} className="mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-700">No archived results found</h3>
            <p className="text-gray-500 mb-4">
              {search ? 'Try adjusting your search' : 'No election results have been archived yet.'}
            </p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(result => renderGridItem(result, result.archive_id))}
          </div>
        ) : (
          renderListTable()
        )}
      </div>

      {/* Election Details Modal */}
      <Transition appear show={!!swinnerElection} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setSwinnerElection(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70 bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 mb-2">
                    {swinnerElection?.election_name}
                  </Dialog.Title>
                  <p className="text-sm text-gray-600 mb-4">
                    Organization: {swinnerElection?.organization}
                  </p>
                  
                  {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                      {error}
                    </div>
                  )}
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Archived Results</h4>
                    
                    {swinnerElection?.archived_results.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No archived results found for this election</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-white">
                            <tr>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Candidate
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Position
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Votes
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Archived Date
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {swinnerElection?.archived_results.map((result) => (
                              <tr key={result.archive_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{result.candidate_name}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{result.position_name}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{result.vote_count}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{new Date(result.archived_at).toLocaleDateString()}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      onClick={() => setSwinnerElection(null)}
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Restore Confirmation Modal */}
      <Transition appear show={showModal === 'restore'} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isProcessing && setShowModal(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70 bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">                  <Dialog.Title as="h3" className="text-lg font-medium text-gray-900 mb-4">
                    Restore Election Results
                  </Dialog.Title>
                  <div className="mt-2 mb-6">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to restore all archived results for this election back to active results? This will make them visible in the main results section.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                      onClick={() => setShowModal(null)}
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      onClick={() => swinnerElectionId && handleRestoreElection(swinnerElectionId)}
                      disabled={isProcessing}
                    >
                      {isProcessing && <Loader4 size={16} />}
                      {isProcessing ? 'Processing...' : 'Restore Election Results'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={showModal === 'delete'} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isProcessing && setShowModal(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70 bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">                  <Dialog.Title as="h3" className="text-lg font-medium text-gray-900 mb-4">
                    Permanently Delete Election Results
                  </Dialog.Title>                  <div className="mt-2 mb-6">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to permanently delete all archived results for this election? This action cannot be undone.
                    </p>
                    {deleteCountdown > 0 && (
                      <div className="mt-3 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
                        ⚠️ Please wait {deleteCountdown} seconds before confirming deletion.
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                      onClick={() => setShowModal(null)}
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>                    <button
                      type="button"
                      className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                        deleteCountdown > 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={() => swinnerElectionId && handleDeleteElection(swinnerElectionId)}
                      disabled={isProcessing || deleteCountdown > 0}
                    >
                      {isProcessing && <Loader4 size={16} />}
                      {isProcessing ? 'Processing...' : deleteCountdown > 0 ? `Delete (${deleteCountdown}s)` : 'Delete Election Results Permanently'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded shadow-lg z-50">
          {notification}
          <button type="button" className="ml-4 text-white font-bold" onClick={() => setNotification(null)}>&times;</button>
        </div>
      )}
    </AdminLayout>
  );
}