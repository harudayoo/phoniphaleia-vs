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
  org_id: number;
};

interface Candidate {
  candidate_id?: number;
  fullname: string;
  party?: string;
  candidate_desc?: string;
  position_id: number | '';
  photo?: File;
  photo_url?: string;
}
interface Position {
  position_id: number;
  position_name: string;
  organization_id?: number;
  inUse?: boolean;
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
              election_id: e.election_id,              election_name: e.election_name,
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
              org_id: e.org_id,
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
  }, [organizations]);  useEffect(() => {
    // This is now only needed to refresh position data when the modal is reopened
    // (The main loading of positions is handled in handleManageCandidates)
    if (!showCandidatesModal || !candidatesElection?.org_id || candidatesLoading) return;
    
    // This will only run if the modal is shown but positions aren't being loaded elsewhere
    if (positions.length === 0) {
      setCandidatesLoading(true);
      setCandidatesError(null);
      
      // Get existing candidates first to know which positions are being used
      fetch(`${API_URL}/elections/${candidatesElection.election_id}/candidates`)
        .then(res => res.json())
        .then(async (candidatesData: Array<{ position_id: number; position_name: string; candidates: Candidate[] }>) => {
          // Track which positions are used by candidates
          const candidatePositionIds = new Set<number>();
          candidatesData.forEach((pos) => {
            if (Array.isArray(pos.candidates) && pos.candidates.length > 0) {
              candidatePositionIds.add(pos.position_id);
            }
          });
          
          // Now fetch positions
          const posRes = await fetch(`${API_URL}/positions/by-election/${candidatesElection.election_id}`);
          const posData: { id: number; name: string; organization_id: number }[] = await posRes.json();
          
          // Mark positions that are in use
          setPositions(posData.map(p => ({ 
            position_id: p.id, 
            position_name: p.name,
            organization_id: p.organization_id,
            inUse: candidatePositionIds.has(p.id)
          })));
        })
        .catch(() => setCandidatesError('Failed to load positions.'))
        .finally(() => setCandidatesLoading(false));
    }
  }, [showCandidatesModal, candidatesElection, candidatesLoading, positions.length]);

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
      // Get the org_id of the selected election (will be used for position verification)
      
      // Fetch candidates for this election first
      const candidatesRes = await fetch(`${API_URL}/elections/${election.election_id}/candidates`);
      const candidatesData: Array<{ position_id: number; position_name: string; candidates: Candidate[] }> = await candidatesRes.json();
      
      // Extract all candidates from all positions for this election
      let allCandidates: Candidate[] = [];
      const candidatePositionIds = new Set<number>();
      candidatesData.forEach((pos) => {
        if (Array.isArray(pos.candidates)) {
          if (pos.candidates.length > 0) candidatePositionIds.add(pos.position_id);
          allCandidates = allCandidates.concat(
            pos.candidates.map((c: any) => {
              let photoUrl = c.photo_url;
              if (!photoUrl && c.photo_path) photoUrl = c.photo_path;
              if (photoUrl) {
                if (photoUrl.startsWith('/api/')) {
                  photoUrl = `${API_URL}${photoUrl.substring(4)}`;
                } else if (photoUrl.startsWith('photos/')) {
                  photoUrl = `${API_URL}/uploads/${photoUrl}`;
                } else if (photoUrl.startsWith('uploads/photos/')) {
                  photoUrl = `${API_URL}/uploads/photos/${photoUrl.split('/').pop()}`;
                } else if (photoUrl.startsWith('uploads/')) {
                  photoUrl = `${API_URL}/uploads/${photoUrl.split('/').pop()}`;
                } else if (!photoUrl.startsWith('http')) {
                  photoUrl = `${API_URL}/uploads/${photoUrl}`;
                }
              }
              return {
                ...c,
                position_id: pos.position_id,
                photo_url: photoUrl
              };
            })
          );
        }
      });
      setCandidates(allCandidates);
      
      const posRes = await fetch(`${API_URL}/positions/by-election/${election.election_id}`);
      const posData: { id: number; name: string; organization_id: number }[] = await posRes.json();
      
      const formattedPositions = posData.map(p => ({
        position_id: p.id,
        position_name: p.name,
        organization_id: p.organization_id,
        inUse: candidatePositionIds.has(p.id)
      }));
      
      setPositions(formattedPositions);
      
      // Save original candidates for diff
      originalCandidatesRef.current = allCandidates;
    } catch {
      setCandidatesError('Failed to load candidates or positions.');
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleAddCandidate = () => {
    setCandidates(c => [...c, { fullname: '', party: '', candidate_desc: '', position_id: '' }]);
  };  const handleUpdateCandidate = (idx: number, field: keyof Candidate, value: string | number | File) => {
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
          if (cand.photo) {
            // If there's a new photo, use FormData
            const formData = new FormData();
            formData.append('fullname', cand.fullname);
            formData.append('position_id', String(cand.position_id));
            if (cand.party) formData.append('party', cand.party);
            if (cand.candidate_desc) formData.append('candidate_desc', cand.candidate_desc);
            formData.append('photo', cand.photo);
            
            await fetch(`${API_URL}/candidates/${cand.candidate_id}`, {
              method: 'PUT',
              body: formData
            });
          } else {
            // No new photo, use JSON
            await fetch(`${API_URL}/candidates/${cand.candidate_id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullname: cand.fullname,
                position_id: cand.position_id,
                party: cand.party,
                candidate_desc: cand.candidate_desc
              })
            });
          }
        } else {
          // Add new candidate
          if (cand.photo) {
            // With photo
            const formData = new FormData();
            formData.append('fullname', cand.fullname);
            formData.append('position_id', String(cand.position_id));
            if (cand.party) formData.append('party', cand.party);
            if (cand.candidate_desc) formData.append('candidate_desc', cand.candidate_desc);
            formData.append('photo', cand.photo);
            
            await fetch(`${API_URL}/elections/${candidatesElection?.election_id}/candidates`, {
              method: 'POST',
              body: formData
            });
          } else {
            // Without photo
            await fetch(`${API_URL}/elections/${candidatesElection?.election_id}/candidates`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullname: cand.fullname,
                position_id: cand.position_id,
                party: cand.party,
                candidate_desc: cand.candidate_desc
              })
            });
          }
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

  const getStatusBadge = (status: string, date_start?: string, date_end?: string) => {
    // Compute status based on dates if available
    let computedStatus = status;
    if (date_start && date_end) {
      const now = new Date();
      const start = new Date(date_start);
      const end = new Date(date_end);

      // Set time to 00:00:00 for start and 23:59:59 for end to include the whole end day
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      if (now >= start && now <= end && status !== 'Canceled') {
        computedStatus = 'Ongoing';
      } else if (now < start && status !== 'Canceled') {
        computedStatus = 'Upcoming';
      } else if (now > end && status !== 'Canceled') {
        computedStatus = 'Finished';
      } else if (status === 'Canceled') {
        computedStatus = 'Canceled';
      }
    }
    switch(computedStatus) {
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
              {getStatusBadge(election.election_status, election.date_start, election.date_end)}
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
          {getStatusBadge(election.election_status, election.date_start, election.date_end)}
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
      />      {showCandidatesModal && (
        <Modal
          isOpen={showCandidatesModal}
          onClose={() => setShowCandidatesModal(false)}
          title="Manage Candidates"
          size="xxxxxxl"
          footer={null}
        >
          {candidatesError && <div className="bg-red-100 text-red-700 p-2 rounded mb-2">{candidatesError}</div>}
          {candidatesLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              <div className="flex justify-between mb-2">
                <button
                  className="flex items-center gap-2 px-3 py-2 bg-blue-100 rounded hover:bg-blue-200 text-sm text-gray-700"
                  onClick={handleAddCandidate}
                  disabled={candidatesLoading || positions.length === 0}
                >
                  + Add Candidate
                </button>
              </div>
              {positions.length === 0 && !candidatesLoading && (
                <div className="bg-yellow-50 text-yellow-800 p-3 rounded mb-4 text-center border border-yellow-200">
                  No positions found for this organization. Please add positions first.
                </div>
              )}
              <div className="space-y-4 max-h-96 overflow-y-auto">                {candidates.map((cand, idx) => {
                  // Sort positions - with used positions (inUse=true) first, then others
                  let dropdownPositions = [...positions].sort((a, b) => {
                    // First sort by inUse (true first)
                    if (a.inUse && !b.inUse) return -1;
                    if (!a.inUse && b.inUse) return 1;
                    // Then by name
                    return a.position_name.localeCompare(b.position_name);
                  });
                  
                  // If candidate has a position_id that's not in our positions list
                  // (might happen if position was moved to another org)
                  if (cand.position_id && !positions.some(p => p.position_id === cand.position_id)) {
                    dropdownPositions = [
                      { 
                        position_id: cand.position_id as number, 
                        position_name: `Current Position (ID: ${cand.position_id})` 
                      },
                      ...dropdownPositions
                    ];
                  }
                  
                  // Remove duplicates (should not happen with current implementation but keeping for safety)
                  const seen = new Set();
                  dropdownPositions = dropdownPositions.filter(p => {
                    if (seen.has(p.position_id)) return false;
                    seen.add(p.position_id);
                    return true;
                  });                  return (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end border-b pb-4 mb-4">
                      {/* Photo Display (Left Side) */}                      <div className="flex items-center justify-center">                        <div className="w-20 h-20 rounded-md overflow-hidden bg-gray-100 border border-gray-200 relative">                          {(cand.photo_url || cand.photo) ? (                            cand.photo ? (
                              <img 
                                src={URL.createObjectURL(cand.photo)}
                                alt={`Photo of ${cand.fullname || 'candidate'}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img 
                                src={cand.photo_url!}
                                alt={`Photo of ${cand.fullname || 'candidate'}`}
                                className="w-full h-full object-cover"
                              />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No Photo
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Candidate Details */}
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-700 font-medium mb-1">Full Name</label>
                        <input className="w-full border text-gray-700 rounded px-3 py-2" value={cand.fullname} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateCandidate(idx, 'fullname', e.target.value)} placeholder="Candidate Name" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 font-medium mb-1">Party</label>
                        <input className="w-full border text-gray-700 rounded px-3 py-2" value={cand.party} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateCandidate(idx, 'party', e.target.value)} placeholder="Party" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 font-medium mb-1">Position</label>
                        <select
                          className="w-full border text-gray-700 rounded px-3 py-2"
                          value={cand.position_id}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateCandidate(idx, 'position_id', Number(e.target.value))}
                          disabled={candidatesLoading || positions.length === 0}
                        >
                          <option value="">Select position</option>
                          {dropdownPositions.map(pos => (
                            <option key={pos.position_id} value={pos.position_id}>{pos.position_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col justify-end">
                        {/* Upload Button */}
                        <input 
                          type="file" 
                          id={`photo-upload-${idx}`}
                          accept="image/jpeg,image/png,image/jpg"
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUpdateCandidate(idx, 'photo', e.target.files[0]);
                            }
                          }}
                        />
                        <label htmlFor={`photo-upload-${idx}`} className="flex-1 flex items-center justify-center gap-1 cursor-pointer px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200 text-sm mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-camera" viewBox="0 0 16 16">
                            <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1v6zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2z"/>
                            <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
                          </svg>
                          Upload Photo
                        </label>
                        
                        {/* Remove Button */}
                        <button 
                          type="button" 
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200 text-sm"
                          onClick={() => handleRemoveCandidate(idx)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-trash" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/>
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z"/>
                          </svg>
                          Remove
                        </button>
                      </div>
                      <div className="md:col-span-5 mt-2">
                        <label className="block text-sm text-gray-700 font-medium mb-1">Description</label>
                        <input className="w-full border text-gray-700 rounded px-3 py-2" value={cand.candidate_desc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateCandidate(idx, 'candidate_desc', e.target.value)} placeholder="Description" />
                      </div>
                    </div>
                  );
                })}
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
                <div className="text-center py-4 text-green-600">
                  Candidates updated successfully!
                </div>
              </Modal>
            </>
          )}
        </Modal>
      )}
    </AdminLayout>
  );
}