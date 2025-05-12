'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import { ArrowRight, Calendar } from 'lucide-react';
import NothingIcon from '@/components/NothingIcon';
import ViewToggle from '@/components/admin/ViewToggle';
import UserSearchFilterBar from '@/components/user/UserSearchFilterBar';

interface Election {
  election_id: number;
  election_name: string;
  election_desc: string;
  organization?: {
    org_name: string;
    college_name?: string;
  };
  date_end: string;
  date_start?: string;
  days_left?: number;
  election_status?: 'Ongoing' | 'Upcoming' | 'Finished' | 'Canceled';
}

export default function UserVotesPage() {
  useUser();
  const [elections, setElections] = useState<Election[]>([]);
  const [filteredElections, setFilteredElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'Ongoing', 'Upcoming', 'Finished', 'Canceled'
  const [sort, setSort] = useState('end-date'); // 'end-date', 'alphabetical'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch available elections
  useEffect(() => {
    const fetchElections = async () => {
      try {
        setLoading(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_URL}/elections`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('voter_token')}`
          }
        });
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        const data = await response.json();
        // Fetch organizations for college lookup
        const orgRes = await fetch(`${API_URL}/organizations`);
        const orgs = await orgRes.json();
        // Process the elections to add days_left, election_status, and college_name
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const processedData = data.map((election: {
          election_id: number;
          election_name: string;
          election_desc: string;
          organization?: { org_name: string };
          date_end: string;
          date_start?: string;
          election_status?: string;
        }) => {
          // Use backend election_status if available, otherwise compute
          let election_status: Election['election_status'] = 'Ongoing';
          if (election.election_status) {
            election_status = election.election_status as Election['election_status'];
          } else {
            const dateStr = election.date_end;
            const [year, month, day] = dateStr.split('-').map(Number);
            const endDate = new Date(year, month - 1, day);
            endDate.setHours(23, 59, 59, 999);
            const diffTime = endDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
              election_status = 'Finished';
            } else if (election.date_start) {
              const [sy, sm, sd] = election.date_start.split('-').map(Number);
              const startDate = new Date(sy, sm - 1, sd);
              startDate.setHours(0, 0, 0, 0);
              if (today < startDate) {
                election_status = 'Upcoming';
              } else if (today >= startDate && today <= endDate) {
                election_status = 'Ongoing';
              }
            }
          }
          let college_name = 'None';
          if (election.organization && election.organization.org_name) {
            const org = orgs.find((o: { name: string; college_name?: string }) => o.name === election.organization!.org_name);
            if (org && org.college_name) college_name = org.college_name;
          }
          const dateStr = election.date_end;
          const [year, month, day] = dateStr.split('-').map(Number);
          const endDate = new Date(year, month - 1, day);
          endDate.setHours(23, 59, 59, 999);
          const diffTime = endDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return Object.assign({}, election, {
            days_left: Math.max(diffDays, 0),
            election_status: election_status,
            organization: Object.assign({}, election.organization, { college_name }),
          });
        });
        setElections(processedData);
        setFilteredElections(processedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching elections:", error);
        setLoading(false);
      }
    };
    fetchElections();
  }, []);

  // Helper function to render the time remaining badge
  const getTimeRemainingBadge = (election: Election) => {
    if (!election.election_status) return null;
    switch(election.election_status) {
      case 'Finished':
        return (
          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
            Election ended
          </span>
        );
      case 'Upcoming':
        return (
          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600">
            Upcoming
          </span>
        );
      case 'Canceled':
        return (
          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-600">
            Canceled
          </span>
        );
      case 'Ongoing':
      default:
        return (
          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600">
            {election.days_left} days left
          </span>
        );
    }
  };

  // Update filter options
  const filterOptions = [
    { value: 'all', label: 'All Elections' },
    { value: 'Upcoming', label: 'Upcoming' },
    { value: 'Ongoing', label: 'Ongoing' },
    { value: 'Finished', label: 'Finished' },
    { value: 'Canceled', label: 'Canceled' },
  ];

  // Filter and sort elections when search, filter, or sort changes
  useEffect(() => {
    let result = [...elections];
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(election =>
        election.election_name.toLowerCase().includes(searchLower) ||
        election.election_desc.toLowerCase().includes(searchLower) ||
        election.organization?.org_name.toLowerCase().includes(searchLower)
      );
    }
    // Updated filtering logic for new election_status mapping
    if (filter !== 'all') {
      result = result.filter(election => election.election_status === filter);
    }
    if (sort === 'end-date') {
      result.sort((a, b) => (a.days_left || 0) - (b.days_left || 0));
    } else if (sort === 'alphabetical') {
      result.sort((a, b) => a.election_name.localeCompare(b.election_name));
    }
    setFilteredElections(result);
  }, [elections, search, filter, sort]);

  return (
    <UserLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Active Elections</h1>
        <p className="text-gray-600 mt-2">
          View and participate in ongoing elections. Your vote matters!
        </p>
      </div>

      <UserSearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        filterValue={filter}
        onFilterChange={setFilter}
        filterOptions={filterOptions}
        searchPlaceholder="Search elections..."
      >
        {/* Sort and view controls */}
        <div className="flex gap-2">
          <ViewToggle view={viewMode} onChange={setViewMode} className="mr-1" />
          <div className="relative">
            <select
              className="appearance-none bg-white border text-gray-600 border-gray-300 rounded-lg pl-10 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="end-date">Ending Soonest</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </UserSearchFilterBar>

      {/* Elections display - conditionally render grid or list view */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 border border-gray-200 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-7 bg-gray-300 rounded w-4/5 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
              <div className="h-10 bg-gray-300 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : filteredElections.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 border border-gray-200 text-center">
          <div className="flex flex-col items-center justify-center">
            <NothingIcon width={80} height={80} className="mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Elections Found</h3>
            <p className="text-gray-600">
              {search || filter !== 'all' ? 'Try adjusting your search or filters' : 'There are no active elections available for you at this time.'}
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredElections.map((election) => (
            <div key={election.election_id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                {election.organization && (
                  <div className="text-sm text-gray-600 mb-1">{election.organization.org_name}</div>
                )}
                <div className="text-xs text-gray-500 mb-2">
                  <span className="font-medium">College:</span> {election.organization?.college_name || 'None'}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{election.election_name}</h3>
                <p className="text-gray-600 text-sm mb-4">{election.election_desc}</p>
                <div className="flex items-center mb-4">
                  <Calendar className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-sm text-gray-600">
                    {election.election_status === 'Finished' ? 'Ended on' : 'Ends on'} {new Date(election.date_end).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="px-6 pb-6 mt-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500">
                    {election.election_status === 'Finished' ? 'Status:' : 'Time remaining:'}
                  </span>
                  {getTimeRemainingBadge(election)}
                </div>
                <Link href={`/user/vote/${election.election_id}`}>
                  <button 
                    className={`w-full ${
                      election.election_status === 'Finished' 
                        ? 'bg-gray-500 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2`}
                    disabled={election.election_status === 'Finished'}
                  >
                    {election.election_status === 'Finished' ? 'Election Closed' : 'Cast Your Vote'} 
                    {election.election_status !== 'Finished' && <ArrowRight size={16} />}
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredElections.map((election) => (
            <div key={election.election_id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="flex-1">
                  {election.organization && (
                    <div className="text-sm text-gray-600 mb-1">{election.organization.org_name}</div>
                  )}
                  <div className="text-xs text-gray-500 mb-2">
                    <span className="font-medium">College:</span> {election.organization?.college_name || 'None'}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{election.election_name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{election.election_desc}</p>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-sm text-gray-600">
                      {election.election_status === 'Finished' ? 'Ended on' : 'Ends on'} {new Date(election.date_end).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-start md:items-end gap-3 mt-4 md:mt-0 md:ml-6">
                  {getTimeRemainingBadge(election)}
                  <Link href={`/user/vote/${election.election_id}`}>
                    <button 
                      className={`${
                        election.election_status === 'Finished' 
                          ? 'bg-gray-500 cursor-not-allowed' 
                          : 'bg-red-600 hover:bg-red-700'
                      } text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2`}
                      disabled={election.election_status === 'Finished'}
                    >
                      {election.election_status === 'Finished' ? 'Election Closed' : 'Cast Your Vote'} 
                      {election.election_status !== 'Finished' && <ArrowRight size={16} />}
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </UserLayout>
  );
}