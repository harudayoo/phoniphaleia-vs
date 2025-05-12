'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import { ArrowRight, Search, Calendar, Filter } from 'lucide-react';
import NothingIcon from '@/components/NothingIcon';
import ViewToggle from '@/components/admin/ViewToggle';

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
  status?: 'ongoing' | 'upcoming' | 'ended' | 'canceled' | 'ending-soon' | 'ending-today';
}

export default function UserVotesPage() {
  useUser();
  const [elections, setElections] = useState<Election[]>([]);
  const [filteredElections, setFilteredElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'ongoing', 'upcoming', 'ended', 'canceled', 'soon-ending'
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
        // Process the elections to add days_left, status, and college_name
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const processedData = data.map((election: {
          election_id: number;
          election_name: string;
          election_desc: string;
          organization?: { org_name: string };
          date_end: string;
          date_start?: string;
        }) => {
          const dateStr = election.date_end;
          const [year, month, day] = dateStr.split('-').map(Number);
          const endDate = new Date(year, month - 1, day);
          endDate.setHours(23, 59, 59, 999);
          const diffTime = endDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          // Updated status mapping
          let status: Election['status'] = 'ongoing';
          if (diffDays < 0) {
            status = 'ended';
          } else if (diffDays === 0) {
            status = 'ending-today';
          } else if (diffDays <= 3) {
            status = 'ending-soon';
          }
          // If election has not started yet, mark as 'upcoming'
          if (election.date_start) {
            const [sy, sm, sd] = election.date_start.split('-').map(Number);
            const startDate = new Date(sy, sm - 1, sd);
            startDate.setHours(0, 0, 0, 0);
            if (today < startDate) {
              status = 'upcoming';
            }
          }
          let college_name = 'None';
          if (election.organization && election.organization.org_name) {
            const org = orgs.find((o: { name: string; college_name?: string }) => o.name === election.organization!.org_name);
            if (org && org.college_name) college_name = org.college_name;
          }
          return Object.assign({}, election, {
            days_left: Math.max(diffDays, 0),
            status,
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
    if (!election.status) return null;
    switch(election.status) {
      case 'ended':
        return (
          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
            Election ended
          </span>
        );
      case 'ending-today':
        return (
          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 animate-pulse">
            Ends today
          </span>
        );
      case 'ending-soon':
        return (
          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-600">
            {election.days_left} {election.days_left === 1 ? 'day' : 'days'} left
          </span>
        );
      case 'upcoming':
        return (
          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600">
            Upcoming
          </span>
        );
      case 'canceled':
        return (
          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-600">
            Canceled
          </span>
        );
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
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'ended', label: 'Finished' },
    { value: 'canceled', label: 'Canceled' },
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
    // Updated filtering logic for new status mapping
    if (filter === 'ongoing') {
      result = result.filter(election => election.status === 'ongoing' || election.status === 'ending-soon' || election.status === 'ending-today');
    } else if (filter === 'upcoming') {
      result = result.filter(election => election.status === 'upcoming');
    } else if (filter === 'ended') {
      result = result.filter(election => election.status === 'ended');
    } else if (filter === 'canceled') {
      result = result.filter(election => election.status === 'canceled');
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
      
      {/* Search and filter controls */}
      <div className="bg-white rounded-xl shadow p-4 mb-8 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-800" />
            <input
              type="text"
              placeholder="Search elections..."
              className="pl-10 pr-4 py-2 w-full border text-gray-800 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <ViewToggle 
              view={viewMode} 
              onChange={setViewMode}
              className="mr-1" 
            />
            
            <div className="relative">
              <select
                className="appearance-none bg-white border text-gray-600 border-gray-300 rounded-lg pl-10 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {filterOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
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
        </div>
      </div>
      
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
                    {election.status === 'ended' ? 'Ended on' : 'Ends on'} {new Date(election.date_end).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="px-6 pb-6 mt-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500">
                    {election.status === 'ended' ? 'Status:' : 'Time remaining:'}
                  </span>
                  {getTimeRemainingBadge(election)}
                </div>
                <Link href={`/user/vote/${election.election_id}`}>
                  <button 
                    className={`w-full ${
                      election.status === 'ended' 
                        ? 'bg-gray-500 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2`}
                    disabled={election.status === 'ended'}
                  >
                    {election.status === 'ended' ? 'Election Closed' : 'Cast Your Vote'} 
                    {election.status !== 'ended' && <ArrowRight size={16} />}
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
                      {election.status === 'ended' ? 'Ended on' : 'Ends on'} {new Date(election.date_end).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-start md:items-end gap-3 mt-4 md:mt-0 md:ml-6">
                  {getTimeRemainingBadge(election)}
                  <Link href={`/user/vote/${election.election_id}`}>
                    <button 
                      className={`${
                        election.status === 'ended' 
                          ? 'bg-gray-500 cursor-not-allowed' 
                          : 'bg-red-600 hover:bg-red-700'
                      } text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2`}
                      disabled={election.status === 'ended'}
                    >
                      {election.status === 'ended' ? 'Election Closed' : 'Cast Your Vote'} 
                      {election.status !== 'ended' && <ArrowRight size={16} />}
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