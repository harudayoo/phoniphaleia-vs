'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { Filter, MoreVertical, Calendar, Users, Award } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/admin/PageHeader';
import SearchFilterBar from '@/components/admin/SearchFilterBar';
import FilterSelect from '@/components/admin/FilterSelect';
import DataView from '@/components/admin/DataView';

type Election = {
  election_id: number;
  election_name: string;
  election_desc: string;
  election_status: 'Ongoing' | 'Scheduled' | 'Finished' | 'Canceled';
  date_start: string;
  date_end: string;
  organization?: { org_name: string };
  voters_count: number;
  participation_rate?: number;
};

const statusOptions = [
  { value: 'ALL', label: 'All Status' },
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Scheduled', label: 'Scheduled' },
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

  useEffect(() => {
    const mockData: Election[] = [
      {
        election_id: 1,
        election_name: "Student Council Election",
        election_desc: "Annual election for student government positions",
        election_status: "Ongoing",
        date_start: "2025-05-01",
        date_end: "2025-05-15",
        organization: { org_name: "Student Affairs Office" },
        voters_count: 3470,
        participation_rate: 57.2
      },
      {
        election_id: 2,
        election_name: "Library Committee Representatives",
        election_desc: "Selection for library committee student members",
        election_status: "Scheduled",
        date_start: "2025-06-01",
        date_end: "2025-06-10",
        organization: { org_name: "University Library" },
        voters_count: 1240,
        participation_rate: undefined
      },
      {
        election_id: 3,
        election_name: "Department Chair Selection",
        election_desc: "Faculty voting for department chair position",
        election_status: "Finished",
        date_start: "2025-03-20",
        date_end: "2025-04-05",
        organization: { org_name: "Computer Science Department" },
        voters_count: 128,
        participation_rate: 92.3
      },
      {
        election_id: 4,
        election_name: "Dormitory Council Election",
        election_desc: "Annual election for dormitory representatives",
        election_status: "Scheduled",
        date_start: "2025-07-10",
        date_end: "2025-07-20",
        organization: { org_name: "Campus Housing" },
        voters_count: 856,
        participation_rate: undefined
      },
      {
        election_id: 5,
        election_name: "Sports Committee Election",
        election_desc: "Selection of student sports representatives",
        election_status: "Ongoing",
        date_start: "2025-05-05",
        date_end: "2025-05-18",
        organization: { org_name: "Athletics Department" },
        voters_count: 745,
        participation_rate: 31.8
      },
      {
        election_id: 6,
        election_name: "Graduate Student Association",
        election_desc: "Board member selection for graduate student body",
        election_status: "Finished",
        date_start: "2025-02-15",
        date_end: "2025-02-28",
        organization: { org_name: "Graduate School" },
        voters_count: 423,
        participation_rate: 76.5
      },
      {
        election_id: 7,
        election_name: "Budget Advisory Committee",
        election_desc: "Student representatives for budget oversight",
        election_status: "Canceled",
        date_start: "2025-04-10",
        date_end: "2025-04-25",
        organization: { org_name: "Finance Office" },
        voters_count: 0,
        participation_rate: 0
      }
    ];

    setTimeout(() => {
      setElections(mockData);
      setLoading(false);
    }, 800);
  }, []);

  const filtered = elections
    .filter(e =>
      (status === 'ALL' || e.election_status === status) &&
      (e.election_name.toLowerCase().includes(search.toLowerCase()) ||
        e.election_desc.toLowerCase().includes(search.toLowerCase()) ||
        (e.organization?.org_name ?? '').toLowerCase().includes(search.toLowerCase()))
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
      case 'Scheduled':
        return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">Scheduled</span>;
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

  const createButton = (
    <Link href="/admin/elections/create">
      <button className="bg-gradient-to-r from-red-700/95 to-red-800 px-4 py-2 text-white font-medium shadow-sm 
                bg-[length:200%_100%] bg-right transition-[background-position] duration-300
                hover:bg-left focus:outline-none focus:ring-2 focus:ring-red-800 disabled:opacity-75 rounded-lg
                flex items-center gap-2">
        <FaPlus size={14} /> Create New Election
      </button>
    </Link>
  );

  const emptyStateAction = (
    <Link href="/admin/elections/create">
      <button className="bg-gradient-to-r from-red-700/95 to-red-800 px-4 py-2 text-white font-medium shadow-sm 
                rounded-lg flex items-center gap-2">
        <FaPlus size={14} />
        <span>Create New Election</span>
      </button>
    </Link>
  );

  const renderGridItem = (election: Election) => {
    const daysRemaining = getDaysRemaining(election.date_end);
    const isActive = election.election_status === 'Ongoing';
    const isScheduled = election.election_status === 'Scheduled';
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
          {isScheduled && (
            <div className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded">
              {`Starts in ${Math.abs(getDaysRemaining(election.date_start))} days`}
            </div>
          )}
          {hasEnded && (
            <div className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
              Ended {Math.abs(daysRemaining)} days ago
            </div>
          )}
          
          <div className="flex gap-2">
            <Link href={`/admin/elections/${election.election_id}`}>
              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                <FaEye size={16} />
              </button>
            </Link>
            <Link href={`/admin/elections/${election.election_id}/edit`}>
              <button className="p-2 text-amber-600 hover:bg-amber-50 rounded" disabled={hasEnded}>
                <FaEdit size={16} />
              </button>
            </Link>
            <button className="p-2 text-red-600 hover:bg-red-50 rounded" disabled={hasEnded}>
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
    const isScheduled = election.election_status === 'Scheduled';
    const hasEnded = election.election_status === 'Finished' || election.election_status === 'Canceled';
    
    return (
      <div key={election.election_id} className="border rounded-lg bg-white shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">{election.organization?.org_name}</span>
          {getStatusBadge(election.election_status)}
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{election.election_name}</h3>
        <p className="text-sm text-gray-500 mb-3">{election.election_desc}</p>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {isActive && (
              <span className="text-blue-700">
                {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Ends today"}
              </span>
            )}
            {isScheduled && (
              <span className="text-amber-700">
                {`Starts in ${Math.abs(getDaysRemaining(election.date_start))} days`}
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
            <Link href={`/admin/elections/${election.election_id}`}>
              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                <FaEye size={16} />
              </button>
            </Link>
            <Link href={`/admin/elections/${election.election_id}/edit`}>
              <button className="p-2 text-amber-600 hover:bg-amber-50 rounded" disabled={hasEnded}>
                <FaEdit size={16} />
              </button>
            </Link>
            <button className="p-2 text-red-600 hover:bg-red-50 rounded" disabled={hasEnded}>
              <FaTrash size={16} />
            </button>
            <div className="relative">
              <button className="p-2 text-gray-600 hover:bg-gray-50 rounded">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Election Management"
        action={createButton}
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
        data={filtered}
        isLoading={loading}
        emptyTitle="No elections found"
        emptyDescription={
          search || status !== 'ALL' 
            ? 'Try adjusting your search or filters' 
            : 'Get started by creating your first election'
        }
        emptyAction={emptyStateAction}
        view={view}
        renderGridItem={renderGridItem}
        renderListItem={renderListItem}
      />
    </AdminLayout>
  );
}