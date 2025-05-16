'use client';
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/layouts/AdminLayout';
import { FaEdit, FaTrash, FaEye, FaUser } from 'react-icons/fa';
import { Filter, Calendar, Users, Award } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import SearchFilterBar from '@/components/admin/SearchFilterBar';
import FilterSelect from '@/components/admin/FilterSelect';
import DataView from '@/components/admin/DataView';
import LoadingState from '@/components/admin/LoadingState';
import NothingIcon from '@/components/NothingIcon';
import EntityDetailModal from '@/components/admin/EntityDetailModal';
import EntityFormModal from '@/components/admin/EntityFormModal';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';
import Modal from '@/components/Modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type Election = {
  election_id: number;
  election_name: string;
  election_desc: string;
  election_status: 'Ongoing' | 'Upcoming' | 'Finished' | 'Canceled';
  date_start: string;
  date_end: string;
  organization?: { org_name: string };
  voters_count: number;
  participation_rate?: number;
  college_name?: string;
  queued_access?: boolean;
  max_concurrent_voters?: number;
  org_id?: number;
};

type ElectionAPIResponse = {
  election_id: number;
  election_name: string;
  election_desc: string;
  election_status: 'Ongoing' | 'Upcoming' | 'Finished' | 'Canceled';
  date_start: string | null;
  date_end: string | null;
  organization?: { org_name: string | null; college_name?: string };
  voters_count: number;
  participation_rate?: number | null;
  queued_access?: boolean;
  max_concurrent_voters?: number;
};

interface Candidate {
  candidate_id?: number;
  fullname: string;
  party?: string;
  candidate_desc?: string;
  position_id: number | '';
}
interface Position {
  position_id: number;
  position_name: string;
}

const statusOptions = [
  { value: 'ALL', label: 'All Status' },
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'Finished', label: 'Finished' },
  { value: 'Canceled', label: 'Canceled' }
];

const sortOptions = [
  { value: 'date_end', label: 'End Date' },
  { value: 'date_start', label: 'Start Date' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'participation', label: 'Participation' }
];

export default function AdminElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_end');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<{ id: number; name: string; college_name: string }[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Election> | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [candidatesElection, setCandidatesElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [candidateToDeleteIdx, setCandidateToDeleteIdx] = useState<number | null>(null);
  const [showCandidateDeleteModal, setShowCandidateDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const originalCandidatesRef = useRef<Candidate[]>([]);

  const router = useRouter();

  const {
    register: editRegister,
    handleSubmit: handleEditSubmit,
    formState: { errors: editErrors },
    reset: resetEditForm,
    setValue: setEditValue,
    watch: watchEdit,
  } = useForm<Election & { queued_access?: boolean; max_concurrent_voters?: number }>({
    defaultValues: editForm ?? undefined
  });

  useEffect(() => {
    if (editForm) {
      resetEditForm(editForm as Election);
    }
  }, [editForm, resetEditForm]);

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const res = await fetch(`${API_URL}/organizations`);
        if (!res.ok) throw new Error('Failed to fetch organizations');
        const orgs: { id: number; name: string; college_name?: string }[] = await res.json();
        setOrganizations(
          orgs.map(org => ({
            id: org.id,
            name: org.name,
            college_name: org.college_name || 'None',
          }))
        );
      } catch {
        // Optionally handle error
      }
    }
    fetchOrganizations();
  }, []);

  useEffect(() => {
    async function fetchElections() {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/elections`);
        if (!response.ok) {
          throw new Error(`Failed to fetch elections: ${response.status}`);
        }
        const data: ElectionAPIResponse[] = await response.json();

        const processedData: Election[] = data
          .filter((e): e is ElectionAPIResponse =>
            typeof e.election_id === 'number' &&
            typeof e.election_name === 'string' &&
            typeof e.election_desc === 'string' &&
            typeof e.election_status === 'string' &&
            (typeof e.date_start === 'string' || e.date_start === null) &&
            (typeof e.date_end === 'string' || e.date_end === null)
          )
          .map(e => {
            return {
              election_id: e.election_id,
              election_name: e.election_name,
              election_desc: e.election_desc,
              election_status: e.election_status as 'Ongoing' | 'Upcoming' | 'Finished' | 'Canceled',
              date_start: e.date_start ?? '',
              date_end: e.date_end ?? '',
              organization: e.organization
                ? { org_name: e.organization.org_name ?? '' }
                : undefined,
              voters_count: e.voters_count ?? 0,
              participation_rate: e.participation_rate ?? undefined,
              college_name: e.organization?.college_name || 'None',
              queued_access: e.queued_access ?? false,
              max_concurrent_voters: e.max_concurrent_voters ?? undefined,
            };
          });
        setElections(processedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching elections:', err);
        setError('Failed to load elections. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchElections();
  }, [organizations]);

  const handleShowInfo = (election: Election) => {
    setSelectedElection(election);
    setShowDetailModal(true);
  };

  const handleEdit = (election: Election) => {
    setEditForm(election);
    setShowEditModal(true);
  };

  const handleDelete = (election: Election) => {
    setSelectedElection(election);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedElection) return;
    try {
      setLoading(true);
      await fetch(`${API_URL}/elections/${selectedElection.election_id}`, {
        method: 'DELETE',
      });
      setElections(prev => prev.filter(e => e.election_id !== selectedElection.election_id));
      setShowDeleteModal(false);
      setSelectedElection(null);
    } catch {
      setError('Failed to delete election.');
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async (updated: Partial<Election & { queued_access?: boolean; max_concurrent_voters?: number }>) => {
    if (!editForm) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/elections/${editForm.election_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error('Failed to update election');
      const updatedElection: Election = await res.json();
      setElections(prev => prev.map(e => e.election_id === updatedElection.election_id ? { ...e, ...updatedElection } : e));
      setShowEditModal(false);
      setEditForm(null);
    } catch {
      setError('Failed to update election.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageCandidates = async (election: Election) => {
    setCandidatesElection(election);
    setShowCandidatesModal(true);
    setCandidatesLoading(true);
    setCandidatesError(null);
    try {
      // Fetch all positions and filter by org_id of the selected election
      const posRes = await fetch(`${API_URL}/positions`);
      const posData: { id: number; name: string; organization_id: number }[] = await posRes.json();
      const orgId = election.org_id;
      // Fetch candidates for this election
      const res = await fetch(`${API_URL}/elections/${election.election_id}/candidates`);
      const data: Array<{ position_id: number; position_name: string; candidates: Candidate[] }> = await res.json();
      let all: Candidate[] = [];
      data.forEach((pos) => {
        if (Array.isArray(pos.candidates)) {
          all = all.concat(pos.candidates.map((c) => ({ ...c, position_id: pos.position_id })));
        }
      });
      setCandidates(all);
      // Build the dropdown positions: all positions for this org, plus any positions referenced by existing candidates (for legacy data)
      const orgPositions = posData.filter((p) => p.organization_id === orgId);
      // Add any positions referenced by candidates that are not in orgPositions
      const candidatePositionIds = new Set(all.map(c => c.position_id));
      const extraPositions = posData.filter(p => candidatePositionIds.has(p.id) && p.organization_id !== orgId);
      // Compose the final list, deduped by id
      const allPositions = [...orgPositions, ...extraPositions].reduce((acc, p) => {
        if (!acc.some(x => x.id === p.id)) acc.push(p);
        return acc;
      }, [] as { id: number; name: string; organization_id: number }[]);
      setPositions(allPositions.map(p => ({ position_id: p.id, position_name: p.name })));
    } catch {
      setCandidatesError('Failed to load candidates.');
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleAddCandidate = () => {
    setCandidates(c => [...c, { fullname: '', party: '', candidate_desc: '', position_id: '' }]);
  };
  const handleUpdateCandidate = (idx: number, field: keyof Candidate, value: string | number) => {
    setCandidates(c => c.map((cand, i) => i === idx ? { ...cand, [field]: value } : cand));
  };
  const handleRemoveCandidate = (idx: number) => {
    setCandidateToDeleteIdx(idx);
    setShowCandidateDeleteModal(true);
  };

  const confirmRemoveCandidate = async () => {
    if (candidateToDeleteIdx === null) return;
    const cand = candidates[candidateToDeleteIdx];
    if (cand.candidate_id) {
      await fetch(`${API_URL}/candidates/${cand.candidate_id}`, { method: 'DELETE' });
    }
    setCandidates(c => c.filter((_, i) => i !== candidateToDeleteIdx));
    setShowCandidateDeleteModal(false);
    setCandidateToDeleteIdx(null);
  };

  const handleSaveCandidates = async () => {
    setCandidatesLoading(true);
    setCandidatesError(null);
    try {
      // Diff original and current candidates
      const original: Candidate[] = originalCandidatesRef.current || [];
      const currentIds = new Set(candidates.filter(c => c.candidate_id).map(c => c.candidate_id));
      // 1. Delete removed candidates
      for (const orig of original) {
        if (orig.candidate_id && !currentIds.has(orig.candidate_id)) {
          await fetch(`${API_URL}/candidates/${orig.candidate_id}`, { method: 'DELETE' });
        }
      }
      // 2. Add or update candidates
      for (const cand of candidates) {
        if (!cand.fullname || !cand.position_id) continue;
        if (cand.candidate_id) {
          // Update
          await fetch(`${API_URL}/candidates/${cand.candidate_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cand)
          });
        } else {
          // Add
          await fetch(`${API_URL}/elections/${candidatesElection?.election_id}/candidates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cand)
          });
        }
      }
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        setShowCandidatesModal(false);
      }, 1500);
    } catch {
      setCandidatesError('Failed to save candidates.');
    } finally {
      setCandidatesLoading(false);
    }
  };

  const getDetailEntity = (election: Election | null) => {
    if (!election) return null;
    return {
      ...election,
      organization: election.organization?.org_name || '',
      date_start: election.date_start || '',
      date_end: election.date_end || '',
      college_name: election.college_name || 'None',
      voters_count: election.voters_count,
      participation_rate: election.participation_rate,
    };
  };

  const filtered = elections
    .filter(e => {
      if (status === 'ALL') return true;
      if (status === 'Ongoing') return e.election_status === 'Ongoing';
      if (status === 'Upcoming') return e.election_status === 'Upcoming';
      if (status === 'Finished') return e.election_status === 'Finished';
      if (status === 'Canceled') return e.election_status === 'Canceled';
      return false;
    })
    .filter(e =>
      e.election_name.toLowerCase().includes(search.toLowerCase()) ||
      e.election_desc.toLowerCase().includes(search.toLowerCase()) ||
      (e.organization?.org_name ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === 'date_start') return new Date(a.date_start).getTime() - new Date(b.date_start).getTime();
      if (sort === 'date_end') return new Date(a.date_end).getTime() - new Date(b.date_end).getTime();
      if (sort === 'name_asc') return a.election_name.localeCompare(b.election_name);
      if (sort === 'name_desc') return b.election_name.localeCompare(a.election_name);
      if (sort === 'participation') {
        const aRate = a.participation_rate ?? 0;
        const bRate = b.participation_rate ?? 0;
        return bRate - aRate;
      }
      return 0;
    });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Ongoing':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Ongoing</span>;
      case 'Upcoming':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Upcoming</span>;
      case 'Finished':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Finished</span>;
      case 'Canceled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Canceled</span>;
      default:
        return null;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderGridItem = (election: Election) => {
    const daysRemaining = getDaysRemaining(election.date_end);
    const isActive = election.election_status === 'Ongoing';
    const hasEnded = election.election_status === 'Finished' || election.election_status === 'Canceled';
    return (
      <div key={election.election_id} className="border rounded-xl bg-white shadow overflow-hidden flex flex-col">
        <div className="p-6 flex-1">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm text-gray-600">{election.organization?.org_name}</span>
            <div className="flex flex-col items-end gap-1 min-h-[40px] justify-center">
              {getStatusBadge(election.election_status)}
              {election.queued_access && (
                <span className="inline-block bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded mt-1 align-middle">Queued Access</span>
              )}
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{election.election_name}</h3>
          <p className="text-sm text-gray-500 mb-4">{election.election_desc}</p>
          <div className="text-xs text-gray-500 mb-2">
            <span className="font-medium">College:</span> {election.college_name || 'None'}
          </div>
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-gray-600">
                {new Date(election.date_start).toLocaleDateString()} - {new Date(election.date_end).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-gray-600">{election.voters_count.toLocaleString()} eligible voters</span>
            </div>
            {election.participation_rate !== undefined && (
              <div className="flex items-center text-sm">
                <Award className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">{election.participation_rate}% participation</span>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-between items-center mt-2">
          {isActive && (
            <div className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Ends today"}
            </div>
          )}
          {hasEnded && (
            <div className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
              Ended {Math.abs(daysRemaining)} days ago
            </div>
          )}
          <div className="flex gap-2">
            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded" onClick={() => handleShowInfo(election)}>
              <FaEye size={16} />
            </button>
            <button className="p-2 text-amber-600 hover:bg-amber-50 rounded" disabled={hasEnded} onClick={() => handleEdit(election)}>
              <FaEdit size={16} />
            </button>
            <button className="p-2 text-green-700 hover:bg-green-50 rounded" onClick={() => handleManageCandidates(election)}>
              <FaUser size={16} />
            </button>
            <button className="p-2 text-red-600 hover:bg-red-50 rounded" disabled={hasEnded} onClick={() => handleDelete(election)}>
              <FaTrash size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderListItem = (election: Election) => {
    const daysRemaining = getDaysRemaining(election.date_end);
    const isActive = election.election_status === 'Ongoing';
    const hasEnded = election.election_status === 'Finished' || election.election_status === 'Canceled';
    
    return (
      <div key={election.election_id} className="border rounded-lg bg-white shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">{election.organization?.org_name}</span>
          {getStatusBadge(election.election_status)}
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{election.election_name}</h3>
        <p className="text-sm text-gray-500 mb-3">{election.election_desc}</p>
        <div className="text-xs text-gray-500 mb-2">
          <span className="font-medium">College:</span> {election.college_name || 'None'}
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {isActive && (
              <span className="text-blue-700">
                {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Ends today"}
              </span>
            )}
            {hasEnded && (
              <span className="text-gray-500">
                Ended {Math.abs(daysRemaining)} days ago
              </span>
            )}
            {election.participation_rate !== undefined && (
              <span className="ml-4 text-green-700">{election.participation_rate}% participation</span>
            )}
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded" onClick={() => handleShowInfo(election)}>
              <FaEye size={16} />
            </button>
            <button className="p-2 text-amber-600 hover:bg-amber-50 rounded" disabled={hasEnded} onClick={() => handleEdit(election)}>
              <FaEdit size={16} />
            </button>
            <button className="p-2 text-green-700 hover:bg-green-50 rounded" onClick={() => handleManageCandidates(election)}>
              <FaUser size={16} />
            </button>
            <button className="p-2 text-red-600 hover:bg-red-50 rounded" disabled={hasEnded} onClick={() => handleDelete(election)}>
              <FaTrash size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Election Management"
      />

      <SearchFilterBar 
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search elections..."
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
          icon={Calendar}
        />
      </SearchFilterBar>

      <DataView 
        title="Election Management"
        description="Manage and view all elections."
        addButtonText="Create New Election"
        onAdd={() => router.push('/admin/elections/make-new')}
      >
        {loading ? (
          <LoadingState message="Loading elections..." />
        ) : error ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2 text-red-600">Error</h3>
            <p className="text-gray-500">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 border border-gray-200 text-center">
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-700">
              <NothingIcon className="mb-4" width={64} height={64} />
              <span className="text-lg font-semibold">No elections found</span>
              <p className="text-gray-500 mt-2">
                {search || status !== 'ALL' 
                  ? 'Try adjusting your search or filters' 
                  : 'Get started by creating your first election'}
              </p>
            </div>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(renderGridItem)}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(renderListItem)}
          </div>
        )}
      </DataView>
      <EntityDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        entity={getDetailEntity(selectedElection)}
        columns={[
          { key: 'election_name', header: 'Election Name' },
          { key: 'election_desc', header: 'Description' },
          { key: 'date_start', header: 'Start Date', render: e => e.date_start ? new Date(e.date_start).toLocaleDateString() : '' },
          { key: 'date_end', header: 'End Date', render: e => e.date_end ? new Date(e.date_end).toLocaleDateString() : '' },
          { key: 'organization', header: 'Organization' },
          { key: 'college_name', header: 'College' },
          { key: 'voters_count', header: 'Eligible Voters' },
          { key: 'participation_rate', header: 'Participation Rate', render: e => e.participation_rate !== undefined ? `${e.participation_rate}%` : 'N/A' },
        ]}
        onEdit={() => { setShowDetailModal(false); if (selectedElection) handleEdit(selectedElection); }}
        onDelete={() => { setShowDetailModal(false); if (selectedElection) handleDelete(selectedElection); }}
      />
      <EntityFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Election"
        fields={[
          { name: 'election_name', label: 'Election Name', type: 'text', required: true },
          { name: 'election_desc', label: 'Description', type: 'textarea' },
          { name: 'date_start', label: 'Start Date', type: 'text', required: true },
          { name: 'date_end', label: 'End Date', type: 'text', required: true },
        ]}
        onSubmit={handleEditSubmit((data) => {
          saveEdit({
            ...data,
            queued_access: watchEdit('queued_access') ?? false,
            max_concurrent_voters: (watchEdit('queued_access') ? (watchEdit('max_concurrent_voters') ?? undefined) : undefined),
          });
        })}
        register={editRegister}
        errors={editErrors}
        isEdit={true}
        customFields={{
          queued_access: {
            value: watchEdit('queued_access') ?? false,
            setValue: (v: boolean) => setEditValue('queued_access', v),
          },
          max_concurrent_voters: {
            value: watchEdit('queued_access') ? (watchEdit('max_concurrent_voters') ?? '') : '',
            setValue: (v: number) => setEditValue('max_concurrent_voters', v),
          },
        }}
      />
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDelete={confirmDelete}
        title="Delete Election"
        entityName={selectedElection?.election_name || ''}
        warningMessage="This will permanently delete the election and all related data."
      />
      {showCandidatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full p-8 max-w-5xl relative">
            <h2 className="text-xl text-gray-800 font-semibold mb-4">Manage Candidates</h2>
            {candidatesError && <div className="bg-red-100 text-red-700 p-2 rounded mb-2">{candidatesError}</div>}
            {candidatesLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                <div className="flex justify-between mb-2">
                  <button className="flex items-center gap-2 px-3 py-2 bg-blue-100 rounded hover:bg-blue-200 text-sm text-gray-700" onClick={handleAddCandidate}>
                    + Add Candidate
                  </button>
                  <button className="px-3 py-2 bg-red-200 hover:bg-red-400 hover:text-slate-50 text-gray-700 rounded" onClick={() => setShowCandidatesModal(false)}>Close</button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {candidates.map((cand, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end border-b pb-4 mb-2">
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-700 font-medium mb-1">Full Name</label>
                        <input className="w-full border text-gray-700 rounded px-3 py-2" value={cand.fullname} onChange={e => handleUpdateCandidate(idx, 'fullname', e.target.value)} placeholder="Candidate Name" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 font-medium mb-1">Party</label>
                        <input className="w-full border text-gray-700 rounded px-3 py-2" value={cand.party} onChange={e => handleUpdateCandidate(idx, 'party', e.target.value)} placeholder="Party" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 font-medium mb-1">Position</label>
                        <select className="w-full border text-gray-700 rounded px-3 py-2" value={cand.position_id} onChange={e => handleUpdateCandidate(idx, 'position_id', Number(e.target.value))}>
                          <option value="">Select position</option>
                          {positions.map(pos => (
                            <option key={pos.position_id} value={pos.position_id}>{pos.position_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 font-medium mb-1">Description</label>
                        <input className="w-full border text-gray-700 rounded px-3 py-2" value={cand.candidate_desc} onChange={e => handleUpdateCandidate(idx, 'candidate_desc', e.target.value)} placeholder="Description" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="text-red-600 hover:text-red-800" onClick={() => handleRemoveCandidate(idx)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-4 gap-2">
                  <button className="px-6 py-2 bg-gradient-to-r from-green-700 to-green-900 hover:from-green-800 hover:to-green-950 text-white rounded" onClick={handleSaveCandidates} disabled={candidates.some(c => !c.fullname || !c.position_id)}>
                    Save Changes
                  </button>
                </div>
                <DeleteConfirmationModal
                  isOpen={showCandidateDeleteModal}
                  onClose={() => { setShowCandidateDeleteModal(false); setCandidateToDeleteIdx(null); }}
                  onDelete={confirmRemoveCandidate}
                  title="Delete Candidate"
                  entityName={candidateToDeleteIdx !== null ? candidates[candidateToDeleteIdx]?.fullname || 'Candidate' : 'Candidate'}
                  warningMessage="This will permanently delete the candidate."
                />
                <Modal
                  isOpen={showSuccessModal}
                  onClose={() => setShowSuccessModal(false)}
                  title="Success"
                  size="sm"
                  footer={null}
                >
                  <div className="text-center py-4">
                    <div className="text-green-700 text-lg font-semibold mb-2">Changes applied successfully!</div>
                  </div>
                </Modal>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}