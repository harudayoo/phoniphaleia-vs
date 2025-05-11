'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaDownload, FaEdit, FaEye, FaTrash, FaLock, FaLockOpen } from 'react-icons/fa';
import { Filter, Calendar, ArrowUp } from 'lucide-react';
import Link from 'next/link';

// Import reusable components
import PageHeader from '@/components/admin/PageHeader';
import SearchFilterBar from '@/components/admin/SearchFilterBar';
import FilterSelect from '@/components/admin/FilterSelect';
import DataView from '@/components/admin/DataView';

type Result = {
  result_id: number;
  election_name: string;
  organization?: { org_name: string };
  status: string;
  published_at: string;
  description?: string;
  participation_rate?: number;
  voters_count?: number;
  total_votes?: number;
  candidates?: {
    name: string;
    votes: number;
    percentage: number;
    winner: boolean;
  }[];
};

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

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const mockData: Result[] = [
          {
            result_id: 1,
            election_name: "Student Council Election 2025",
            organization: { org_name: "Student Affairs Office" },
            status: "Published",
            published_at: "2025-04-05T14:30:00",
            description: "Official results for the 2025 student council election",
            participation_rate: 78.4,
            voters_count: 1802,
            total_votes: 1412,
            candidates: [
              { name: "Maria Rodriguez", votes: 642, percentage: 45.5, winner: true },
              { name: "James Wilson", votes: 524, percentage: 37.1, winner: false },
              { name: "Sarah Thompson", votes: 246, percentage: 17.4, winner: false }
            ]
          },
          {
            result_id: 2,
            election_name: "CS Department Chair Selection",
            organization: { org_name: "Computer Science Department" },
            status: "Pending",
            published_at: "2025-05-01T10:00:00",
            description: "Results pending final verification",
            participation_rate: 91.2,
            voters_count: 245,
            total_votes: 223
          },
          {
            result_id: 3,
            election_name: "Library Committee Representatives",
            organization: { org_name: "University Library" },
            status: "Published",
            published_at: "2025-03-15T12:00:00",
            description: "Final results for library committee election",
            participation_rate: 63.7,
            voters_count: 950,
            total_votes: 605,
            candidates: [
              { name: "Michael Brown", votes: 230, percentage: 38.0, winner: true },
              { name: "Jennifer Davis", votes: 187, percentage: 30.9, winner: true },
              { name: "Robert Jones", votes: 188, percentage: 31.1, winner: false }
            ]
          },
          {
            result_id: 4,
            election_name: "Campus Safety Committee",
            organization: { org_name: "Campus Security" },
            status: "Archived",
            published_at: "2024-10-22T09:00:00",
            description: "Archive of last term's safety committee election",
            participation_rate: 52.8,
            voters_count: 1240,
            total_votes: 655
          }
        ];
        
        setTimeout(() => {
          setResults(mockData);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error("Error fetching results:", error);
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

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
    <div key={key ?? result.result_id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm text-gray-600">{result.organization?.org_name}</span>
          {getStatusBadge(result.status)}
        </div>
        
        <h3 className="text-lg font-semibold text-gray-800 mb-3">{result.election_name}</h3>
        
        <div className="flex items-center mb-3 text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span>Published: {new Date(result.published_at).toLocaleDateString()}</span>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{result.description}</p>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 rounded-md p-2">
            <div className="text-xs text-blue-700 mb-1">Voters</div>
            <div className="font-medium">{result.voters_count?.toLocaleString()}</div>
          </div>
          <div className="bg-green-50 rounded-md p-2">
            <div className="text-xs text-green-700 mb-1">Participation</div>
            <div className="font-medium">{result.participation_rate}%</div>
          </div>
        </div>
        
        {result.candidates && result.candidates.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Top Candidate</div>
            <div className="text-gray-800">
              {result.candidates.find(c => c.winner)?.name || result.candidates[0].name}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
          <div className="flex space-x-2">
            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
              <FaDownload size={16} />
            </button>
            <Link href={`/admin/results/${result.result_id}`}>
              <button className="p-2 text-green-600 hover:bg-green-50 rounded">
                <FaEye size={16} />
              </button>
            </Link>
          </div>
          <div className="flex space-x-2">
            {result.status === 'Published' ? (
              <button className="p-2 text-amber-600 hover:bg-amber-50 rounded">
                <FaLock size={16} />
              </button>
            ) : (
              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                <FaLockOpen size={16} />
              </button>
            )}
            <Link href={`/admin/results/${result.result_id}/edit`}>
              <button className="p-2 text-amber-600 hover:bg-amber-50 rounded">
                <FaEdit size={16} />
              </button>
            </Link>
            <button className="p-2 text-red-600 hover:bg-red-50 rounded">
              <FaTrash size={16} />
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
                <div className="text-sm font-medium text-gray-900">{result.election_name}</div>
                <div className="text-sm text-gray-500 truncate max-w-[200px]">{result.description}</div>
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
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <Link href={`/admin/results/${result.result_id}`}>
                    <button className="p-1 text-blue-600 hover:text-blue-900">
                      <FaEye size={16} />
                    </button>
                  </Link>
                  <Link href={`/admin/results/${result.result_id}/edit`}>
                    <button className="p-1 text-amber-600 hover:text-amber-900">
                      <FaEdit size={16} />
                    </button>
                  </Link>
                  <button className="p-1 text-red-600 hover:text-red-900">
                    <FaTrash size={16} />
                  </button>
                </div>
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
        title="Election Results" 
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
      </SearchFilterBar>

      <DataView
        title="Election Results"
        description="Browse, search, and manage election results."
      >
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-gray-500 mb-4">
              {search || status !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Create your first election result'}
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
    </AdminLayout>
  );
}