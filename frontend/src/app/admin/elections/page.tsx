'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import AdminLayout from '@/layouts/AdminLayout';
import { FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { Filter, Calendar, Users, Award } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import SearchFilterBar from '@/components/admin/SearchFilterBar';
import FilterSelect from '@/components/admin/FilterSelect';
import DataView from '@/components/admin/DataView';
import LoadingState from '@/components/admin/LoadingState';
import NothingIcon from '@/components/NothingIcon';
import CreateElectionModal from '@/components/admin/CreateElectionModal';
import EntityDetailModal from '@/components/admin/EntityDetailModal';
import EntityFormModal from '@/components/admin/EntityFormModal';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';

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
};

type ElectionAPIResponse = {
  election_id: number;
  election_name: string;
  election_desc: string;
  election_status: 'Ongoing' | 'Upcoming' | 'Finished' | 'Canceled';
  date_start: string | null;
  date_end: string | null;
  organization?: { org_name: string | null };
  voters_count: number;
  participation_rate?: number | null;
};

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
  const [modalOpen, setModalOpen] = useState(false);
  const [organizations, setOrganizations] = useState<{ id: number; name: string; college_name: string }[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Election> | null>(null);

  // Add useForm for editing elections
  const {
    register: editRegister,
    handleSubmit: handleEditSubmit,
    formState: { errors: editErrors },
    reset: resetEditForm
  } = useForm<Election>({
    defaultValues: editForm ?? undefined
  });

  // When editForm changes (i.e., when opening the edit modal), reset the form values
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
            let collegeName = 'None';
            if (e.organization && e.organization.org_name) {
              const org = organizations.find(
                o => o.name === e.organization!.org_name
              );
              if (org && org.college_name) {
                collegeName = org.college_name;
              }
            }
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
              college_name: collegeName,
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

  const saveEdit = async (updated: Partial<Election>) => {
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
            {getStatusBadge(election.election_status)}
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
        onAdd={() => setModalOpen(true)}
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
      <CreateElectionModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        onCreated={async () => {
          setLoading(true);
          try {
            const response = await fetch(`${API_URL}/elections`);
            if (!response.ok) throw new Error('Failed to fetch elections');
            const data: ElectionAPIResponse[] = await response.json();
            const processedData: Election[] = data
              .filter(e =>
                typeof e.election_id === 'number' &&
                typeof e.election_name === 'string' &&
                typeof e.election_desc === 'string' &&
                typeof e.election_status === 'string' &&
                (typeof e.date_start === 'string' || e.date_start === null) &&
                (typeof e.date_end === 'string' || e.date_end === null)
              )
              .map(e => {
                let collegeName = 'None';
                if (e.organization && e.organization.org_name) {
                  const org = organizations.find(
                    o => o.name === e.organization!.org_name
                  );
                  if (org && org.college_name) {
                    collegeName = org.college_name;
                  }
                }
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
                  college_name: collegeName,
                };
              });
            setElections(processedData);
            setError(null);
          } catch {
            setError('Failed to load elections. Please try again later.');
          } finally {
            setLoading(false);
          }
        }}
      />
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
        onSubmit={handleEditSubmit(saveEdit)}
        register={editRegister}
        errors={editErrors}
        isEdit={true}
      />
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDelete={confirmDelete}
        title="Delete Election"
        entityName={selectedElection?.election_name || ''}
        warningMessage="This will permanently delete the election and all related data."
      />
    </AdminLayout>
  );
}