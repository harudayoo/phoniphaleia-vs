'use client';
import { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaDownload, FaEye, FaTrash } from 'react-icons/fa';
import { Filter, Calendar, ArrowUp, Key, Shield } from 'lucide-react';

// Import reusable components
import PageHeader from '@/components/admin/PageHeader';
import SearchFilterBar from '@/components/admin/SearchFilterBar';
import FilterSelect from '@/components/admin/FilterSelect';
import DataView from '@/components/admin/DataView';
import Loader4 from '@/components/Loader4';
import NothingIcon from '@/components/NothingIcon';

type Result = {
  result_id: number;
  election_name: string;
  organization?: { org_name: string };
  status: string;
  published_at: string;
  end_date?: string; // Add end_date to Result type
  description?: string;
  participation_rate?: number;
  voters_count?: number;
  total_votes?: number;
  crypto_enabled?: boolean;
  threshold_crypto?: boolean;
  zkp_verified?: boolean;
  candidates?: {
    name: string;
    votes: number;
    percentage: number;
    winner: boolean;
  }[];
};

interface BackendElectionResult {
  election_id: number;
  election_name: string;
  organization: string;
  ended_at: string;
  winner: string;
  total_votes: number;
  participation_rate: number;
  candidates: {
    name: string;
    votes: number;
    percentage: number;
    winner: boolean;
  }[];
}

interface BackendOngoingElection {
  election_id?: number;
  result_id?: number;
  id?: number;
  election_name: string;
  organization?: string | { org_name: string };
  election_status?: string;
  date_start?: string;
  date_end?: string;
  election_desc?: string;
  participation_rate?: number;
  voters_count?: number;
  total_votes?: number;
  crypto_enabled?: boolean;
  threshold_crypto?: boolean;
  zkp_verified?: boolean;
  candidates?: unknown[];
}

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Published', label: 'Published' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Archived', label: 'Archived' }
];

const sortOptions = [
  { value: 'date_desc', label: 'Date (Newest)' },
  { value: 'date_asc', label: 'Date (Oldest)' },
  { value: 'name_asc', label: 'Election Name (A-Z)' },
  { value: 'name_desc', label: 'Election Name (Z-A)' },
  { value: 'participation_desc', label: 'Participation (Highest)' },
  { value: 'participation_asc', label: 'Participation (Lowest)' }
];

export default function AdminResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [tallyModalOpen, setTallyModalOpen] = useState(false);
  const [step, setStep] = useState<'warning' | 'Selected' | 'confirm'>('warning');
  const [ongoingElections, setOngoingElections] = useState<Result[]>([]);
  const [fetchingOngoing, setFetchingOngoing] = useState(false);
  const [selectElection, setSelectElection] = useState<Result | null>(null);
  const [proceeding, setProceeding] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        // This endpoint relies solely on homomorphic encryption for vote counting
        const res = await fetch(`${backendUrl}/election_results`);
        if (!res.ok) throw new Error('Failed to fetch results');
        const data = await res.json();
        
        // Map backend response to frontend Result type
        const mappedResults: Result[] = (data as BackendElectionResult[]).map((item) => ({
          result_id: item.election_id,
          election_name: item.election_name,
          organization: { org_name: item.organization || '' },
          status: 'Published', // Since these are finished elections, mark as published
          published_at: item.ended_at || '',
          description: '', // Not available in backend response
          participation_rate: item.participation_rate || 0,
          voters_count: 0, // Not available in this endpoint
          total_votes: item.total_votes || 0,
          crypto_enabled: false, // Not available in this endpoint
          threshold_crypto: false,
          zkp_verified: false,
          candidates: item.candidates || []
        }));
        
        setResults(mappedResults);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching results:", error);
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const openTallyModal = () => {
    setStep('warning');
    setTallyModalOpen(true);
    setSelectElection(null);
    setOngoingElections([]);
  };

  const fetchOngoing = async (): Promise<void> => {
    setFetchingOngoing(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      // Fetch all elections from the database (Election model)
      const res = await fetch(`${backendUrl}/elections`);
      const data: BackendOngoingElection[] = await res.json();
      // Only include elections with status 'Ongoing' (case-insensitive)
      const filtered = (Array.isArray(data) ? data : []).filter(
        el => (el.election_status || '').toLowerCase() === 'ongoing'
      );
      const mapped: Result[] = filtered.map((el) => ({
        result_id: el.election_id ?? 0,
        election_name: el.election_name || '',
        organization: typeof el.organization === 'string'
          ? { org_name: el.organization as string }
          : (el.organization || { org_name: '' }),
        status: el.election_status || 'Ongoing',
        published_at: el.date_start || '',
        end_date: el.date_end || '',
        description: el.election_desc || '',
        participation_rate: el.participation_rate || 0,
        voters_count: el.voters_count || 0,
        total_votes: el.total_votes || 0,
        crypto_enabled: el.crypto_enabled || false,
        threshold_crypto: el.threshold_crypto || false,
        zkp_verified: el.zkp_verified || false,
        candidates: (el.candidates as Result['candidates']) || [],
      }));
      setOngoingElections(mapped);
    } catch (err) {
      setOngoingElections([]);
      console.error('Error fetching ongoing elections:', err);
    }
    setFetchingOngoing(false);
  };

  const handleProceed = () => {
    setStep('confirm');
  };

  const handleConfirm = () => {
    setProceeding(true);
    setTimeout(() => {
      setProceeding(false);
      setTallyModalOpen(false);
      if (selectElection) {
        // Use result_id for redirect (which is actually election_id in this context)
        router.push(`/admin/results/tally?election_id=${selectElection.result_id}`);
      }
    }, 1000);
  };

  // Download CSV for a result
  const handleDownload = (result: Result) => {
    if (!Array.isArray(result.candidates) || result.candidates.length === 0) {
      setNotification('No candidate data to export.');
      return;
    }
    const csv = [
      'Candidate, Votes, Percentage, winner',
      ...result.candidates.map(c => `${c.name},${c.votes},${c.percentage},${c.winner ? 'Yes' : 'No'}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.election_name.replace(/\s+/g, '_')}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setNotification('Results exported as CSV.');
  };

  // Delete result (with confirmation)
  const handleDelete = async (result: Result) => {
    setError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      // Only delete the election results, not the election session
      const res = await fetch(`${backendUrl}/election_results/${result.result_id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete election results.');
      }      setResults((prev: Result[]) => prev.filter(r => r.result_id !== result.result_id));
      setNotification('Election results archived successfully.');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to delete election results.');
      } else {
        setError('Failed to delete election results.');
      }
    }
    setShowDeleteModal(null);
  };

  const filtered = results
    .filter(r =>
      (status === 'ALL' || r.status === status) &&
      (r.election_name.toLowerCase().includes(search.toLowerCase()) ||
        (r.organization?.org_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.description ?? '').toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sort === 'date_asc') return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
      if (sort === 'date_desc') return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      if (sort === 'name_asc') return a.election_name.localeCompare(b.election_name);
      if (sort === 'name_desc') return b.election_name.localeCompare(a.election_name);
      if (sort === 'participation_asc') return (a.participation_rate || 0) - (b.participation_rate || 0);
      if (sort === 'participation_desc') return (b.participation_rate || 0) - (a.participation_rate || 0);
      return 0;
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Published':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Published</span>;
      case 'Pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Pending</span>;
      case 'Archived':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Archived</span>;
      default:
        return null;
    }
  };
  const renderGridItem = (result: Result, key?: React.Key) => (
    <div key={key ?? result.result_id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-200">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <span className="text-sm font-medium text-gray-600">{result.organization?.org_name}</span>
          {getStatusBadge(result.status)}
        </div>
        
        <h3 className="text-lg font-semibold text-gray-800 mb-3 line-clamp-2">{result.election_name}</h3>
        
        <div className="flex items-center mb-3 text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span>Published: {new Date(result.published_at).toLocaleDateString()}</span>
        </div>
        
        {result.crypto_enabled && (
          <div className="flex items-center gap-1 mb-3 text-xs">
            {result.threshold_crypto && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full flex items-center">
                <Key className="h-3 w-3 mr-1" />
                Threshold Crypto
              </span>
            )}
            {result.zkp_verified && (
              <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full flex items-center">
                <Shield className="h-3 w-3 mr-1" />
                ZKP Verified
              </span>
            )}
          </div>
        )}
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{result.description}</p>
        
        <div className="grid grid-cols-1 mb-4">
          <div className="bg-blue-50 rounded-lg p-3 w-full">
            <div className="text-xs text-blue-700 mb-1 font-medium">Total Votes</div>
            <div className="font-semibold text-blue-800">{result.total_votes?.toLocaleString()}</div>
          </div>
        </div>
         <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <button type="button" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" onClick={() => handleDownload(result)}>
                <FaDownload size={16} />
              </button>
              <button type="button" className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" onClick={() => router.push(`/admin/results/${result.result_id}`)}>
                <FaEye size={16} />
              </button>
            </div>
            <div className="flex space-x-2">
              <button type="button" className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" onClick={() => setShowDeleteModal(result.result_id)}>
                <FaTrash size={16} />
              </button>
            </div>
          </div>
        {showDeleteModal === result.result_id && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 bg-opacity-30 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-fadeIn">              <h3 className="text-xl font-semibold mb-4 text-gray-800">Confirm Archiving</h3>
              <div className="mb-6 text-gray-600 leading-relaxed">
                Are you sure you want to archive the results for <b>{result.election_name}</b>? This will move the data to the archive section.
              </div>
              {error && <div className="bg-red-100 text-red-800 px-4 py-3 rounded-lg mb-4 text-center">{error}</div>}
              <div className="flex gap-3">
                <button type="button" className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium" onClick={() => setShowDeleteModal(null)}>
                  Cancel
                </button>                <button type="button" className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-medium" onClick={() => handleDelete(result)}>
                  Archive
                </button>
              </div>
            </div>
          </div>
        )}
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
              Published
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Participation
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filtered.map((result) => (
            <tr key={result.result_id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-gray-900">{result.election_name}</div>
                  <div className="text-sm text-gray-500 truncate max-w-[200px]">{result.description}</div>
                  {result.crypto_enabled && (
                    <div className="flex items-center mt-1 gap-1">
                      {result.threshold_crypto && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs flex items-center">
                          <Key className="h-2.5 w-2.5 mr-0.5" />
                          TH
                        </span>
                      )}
                      {result.zkp_verified && (
                        <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full text-xs flex items-center">
                          <Shield className="h-2.5 w-2.5 mr-0.5" />
                          ZKP
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{result.organization?.org_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{new Date(result.published_at).toLocaleDateString()}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{result.participation_rate}%</div>
                <div className="text-xs text-gray-500">{result.total_votes} of {result.voters_count}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(result.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">                <div className="flex justify-end space-x-2">
                  <button type="button" className="p-1 text-blue-600 hover:text-blue-900" onClick={() => router.push(`/admin/results/${result.result_id}`)}>
                    <FaEye size={16} />
                  </button>
                  <button type="button" className="p-1 text-red-600 hover:text-red-900" onClick={() => setShowDeleteModal(result.result_id)}>
                    <FaTrash size={16} />
                  </button>
                </div>
                {showDeleteModal === result.result_id && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black/70 bg-opacity-30 z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full animate-fadeIn">                      <h3 className="text-lg font-semibold mb-2">Confirm Archiving</h3>
                      <div className="mb-4 text-gray-600">
                        Are you sure you want to archive the results for <b>{result.election_name}</b>? This will move the data to the archive section.
                      </div>
                      {error && <div className="bg-red-100 text-red-800 px-4 py-2 rounded mb-2 text-center">{error}</div>}
                      <div className="flex gap-3 justify-end">
                        <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowDeleteModal(null)}>
                          Cancel
                        </button>                          <button type="button" className="px-4 py-2 rounded bg-red-700 text-white hover:bg-red-800" onClick={() => handleDelete(result)}>
                            Archive
                          </button>
                      </div>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <AdminLayout>      <PageHeader 
        title="Election Results" 
        action={
          <button
            onClick={() => router.push('/admin/results/archive')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
          >
            View Archives
          </button>
        }
      />

      <SearchFilterBar 
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by election name, organization, or description..."
        view={view}
        onViewChange={setView}
      >
        <FilterSelect 
          value={status}
          onChange={setStatus}
          options={statusOptions}
          icon={Filter}
        />
        
        <FilterSelect 
          value={sort}
          onChange={setSort}
          options={sortOptions}
          icon={ArrowUp}
        />
      </SearchFilterBar>      <DataView
        title="Election Results"
        description="Browse, search, and manage election results. All vote counts are securely tallied using homomorphic encryption."
        addButtonText="Tally an Election"
        onAdd={openTallyModal}
      >
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <NothingIcon width={80} height={80} className="mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-700">No results found</h3>
            <p className="text-gray-500 mb-4">
              {search || status !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'No election results available.'}
            </p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(result => renderGridItem(result, result.result_id))}
          </div>
        ) : (
          renderListTable()
        )}
      </DataView>

      {/* Tally Modal */}
      <Transition appear show={tallyModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 " onClose={() => setTallyModalOpen(false)}>
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
                <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all">
                  {step === 'warning' && (
                    <>
                      <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 mb-4">
                        Tally an Election
                      </Dialog.Title>
                      <div className="mb-8 text-gray-700 leading-relaxed">
                        Manually creating a tally for an election will automatically set its status to <b>Finished</b> and voting will be <b>closed</b> for that election. This action cannot be undone.
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                          onClick={() => setTallyModalOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-6 py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-800 font-medium transition-colors"
                          onClick={() => { setStep('Selected'); fetchOngoing(); }}
                        >
                          Continue
                        </button>
                      </div>
                    </>
                  )}
                  {step === 'Selected' && (
                    <>
                      <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 mb-4">
                        Selected Ongoing Election
                      </Dialog.Title>
                      {fetchingOngoing ? (
                        <div className="flex justify-center py-12"><Loader4 size={40} /></div>
                      ) : ongoingElections.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="text-gray-500 mb-6">No ongoing elections found.</div>
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                              onClick={() => setTallyModalOpen(false)}
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4 max-h-96 overflow-y-auto mb-8">
                            {ongoingElections.map(el => {
                              const isSelect = selectElection?.result_id === el.result_id;
                              return (
                                <div
                                  key={el.result_id}
                                  className={`border rounded-lg p-4 cursor-pointer transition-all shadow-sm ${isSelect ? 'border-yellow-600 bg-yellow-50' : 'border-gray-200 bg-white'} hover:border-yelow-400`}
                                  onClick={() => setSelectElection(el)}
                                  tabIndex={0}
                                  role="button"
                                  aria-pressed={isSelect}
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="font-semibold text-lg text-gray-800">{el.election_name}</div>
                                    {isSelect && <span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded">Selected</span>}
                                  </div>
                                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-1">
                                    <div><span className="font-medium">Organization:</span> {el.organization?.org_name || 'N/A'}</div>
                                  </div>
                                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                    <div><span className="font-medium">Start:</span> {el.published_at ? new Date(el.published_at).toLocaleDateString() : 'N/A'}</div>
                                    <div><span className="font-medium">End:</span> {el.end_date ? new Date(el.end_date).toLocaleDateString() : 'N/A'}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                              onClick={() => setTallyModalOpen(false)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="px-4 py-2.5 bg-red-700 text-white rounded-lg hover:bg-red-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!selectElection}
                              onClick={handleProceed}
                            >
                              Proceed
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                  {step === 'confirm' && selectElection && (
                    <>
                      <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 mb-4">
                        Confirm Tally
                      </Dialog.Title>
                      <div className="mb-8 text-gray-700 leading-relaxed">
                        Are you sure you want to tally <b>{selectElection.election_name}</b>? This will close voting and set the status to <b>Finished</b>.
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:opacity-50"
                          onClick={() => setTallyModalOpen(false)}
                          disabled={proceeding}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          onClick={handleConfirm}
                          disabled={proceeding}
                        >
                          {proceeding && <Loader4 size={16} />}
                          {proceeding ? 'Processing...' : 'Yes, Tally Election'}
                        </button>
                      </div>
                    </>
                  )}
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