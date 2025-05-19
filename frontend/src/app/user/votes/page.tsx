'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import { ArrowRight, Calendar } from 'lucide-react';
import NothingIcon from '@/components/NothingIcon';
import ViewToggle from '@/components/user/ViewToggle';
import UserSearchFilterBar from '@/components/user/UserSearchFilterBar';
import toast, { Toaster } from 'react-hot-toast';

interface Election {
  election_id: number;
  election_name: string;
  election_desc: string;
  organization?: {
    org_name: string;
    college_id?: number;
    college_name?: string;
  };
  date_end: string;
  date_start?: string;
  days_left?: number;
  election_status?: 'Ongoing' | 'Upcoming' | 'Finished' | 'Canceled';
  queued_access?: boolean;
  max_concurrent_voters?: number;
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
  const [activeVoters, setActiveVoters] = useState<{ [electionId: number]: number }>({});
  const [waitlistStatus, setWaitlistStatus] = useState<{ [electionId: number]: 'waiting' | 'active' | null }>({});

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
        // Use the college_name directly from the API response for each election
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const processedData: Election[] = (data as Election[]).map((election) => {
          let election_status: Election['election_status'] = 'Ongoing';
          if (election.election_status) {
            election_status = election.election_status as Election['election_status'];
          } else {
            const dateStr: string = election.date_end;
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
          // Use college_name from API response if present
          const college_name = election.organization?.college_name || 'None';
          // Only calculate diffTime/diffDays once
          const dateStr2: string = election.date_end;
          const [year2, month2, day2] = dateStr2.split('-').map(Number);
          const endDate2 = new Date(year2, month2 - 1, day2);
          endDate2.setHours(23, 59, 59, 999);
          const diffTime2 = endDate2.getTime() - today.getTime();
          const diffDays2 = Math.ceil(diffTime2 / (1000 * 60 * 60 * 24));
          return {
            ...election,
            days_left: Math.max(diffDays2, 0),
            election_status,
            organization: {
              org_name: election.organization?.org_name || '',
              college_id: election.organization?.college_id,
              college_name,
            },
          };
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

  // Fetch active voter counts for queued elections
  useEffect(() => {
    const fetchActiveVoters = async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const updates: { [electionId: number]: number } = {};
      await Promise.all(
        filteredElections.filter(e => e.queued_access).map(async (election) => {
          try {
            const res = await fetch(`${API_URL}/elections/${election.election_id}/active_voters`);
            if (res.ok) {
              const data = await res.json();
              updates[election.election_id] = data.active_voters;
            }
          } catch {}
        })
      );
      setActiveVoters(updates);
    };
    if (filteredElections.some(e => e.queued_access)) {
      fetchActiveVoters();
      const interval = setInterval(fetchActiveVoters, 5000);
      return () => clearInterval(interval);
    }
  }, [filteredElections]);

  // Poll for waitlist activation for elections where the user is waiting
  useEffect(() => {
    const pollWaitlist = async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      for (const election of filteredElections) {
        if (election.queued_access && waitlistStatus[election.election_id] === 'waiting') {
          try {
            const res = await fetch(`${API_URL}/elections/${election.election_id}/waitlist/position?voter_id=${user.student_id}`);
            if (res.ok) {
              const data = await res.json();
              if (data.position === 1) {
                const activeRes = await fetch(`${API_URL}/elections/${election.election_id}/active_voters`);
                if (activeRes.ok) {
                  const activeData = await activeRes.json();
                  if (activeData.active_voters < Number(election.max_concurrent_voters || 1)) {
                    setWaitlistStatus(prev => ({ ...prev, [election.election_id]: 'active' }));
                    toast((t) => (
                      <span>
                        It&apos;s your turn to vote!{' '}
                        <button
                          className="underline text-blue-700 ml-2"
                          onClick={() => {
                            toast.dismiss(t.id);
                            window.location.href = `/user/votes/access-check?election_id=${election.election_id}`;
                          }}
                        >
                          Click here to proceed
                        </button>
                      </span>
                    ), { duration: 10000, icon: '✅' });
                  }
                }
              }
            }
          } catch {}
        }
      }
    };
    if (Object.values(waitlistStatus).includes('waiting')) {
      const interval = setInterval(pollWaitlist, 5000);
      return () => clearInterval(interval);
    }
  }, [filteredElections, waitlistStatus]);

  // Helper to compute accurate status based on dates and current date
  const computeElectionStatus = (election: Election): Election['election_status'] => {
    if (election.election_status === 'Canceled') return 'Canceled';
    const now = new Date();
    const start = election.date_start ? new Date(election.date_start) : null;
    const end = new Date(election.date_end);
    // Set time to 00:00:00 for start and 23:59:59 for end
    if (start) start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    if (start && now >= start && now <= end) return 'Ongoing';
    if (start && now < start) return 'Upcoming';
    if (now > end) return 'Finished';
    return election.election_status || 'Upcoming';
  };

  // Helper function to format time remaining
  const formatTimeRemaining = (endDateStr: string) => {
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    if (diff <= 0) return 'Ended';
    const seconds = Math.floor(diff / 1000) % 60;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24)) % 7;
    const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7)) % 4;
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} left`;
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} left`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} left`;
    return `${seconds} second${seconds > 1 ? 's' : ''} left`;
  };

  // Helper function to render the time remaining badge
  const getTimeRemainingBadge = (election: Election) => {
    if (!election.election_status) return null;
    if (election.election_status === 'Finished') {
      return (
        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
          Election ended
        </span>
      );
    }
    if (election.election_status === 'Canceled') {
      return (
        <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-600">
          Canceled
        </span>
      );
    }
    // Show actual time remaining for Ongoing/Upcoming
    return (
      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600">
        {formatTimeRemaining(election.date_end)}
      </span>
    );
  };

  // Helper function to render the status badge (top-right corner)
  const getStatusBadge = (election: Election) => {
    const status = computeElectionStatus(election);
    let color = 'bg-blue-100 text-blue-600';
    if (status === 'Finished') color = 'bg-gray-100 text-gray-600';
    if (status === 'Canceled') color = 'bg-red-100 text-red-600';
    if (status === 'Upcoming') color = 'bg-yellow-100 text-yellow-600';
    return (
      <span className={`text-xs px-2 py-1 rounded font-semibold shadow ${color}`}>
        {status}
      </span>
    );
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
      <Toaster position="top-center" />
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
          {filteredElections.map((election) => {
            const status = computeElectionStatus(election);
            return (
              <div key={election.election_id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex flex-col relative">
                <div className="px-6 pt-6 pb-0 flex flex-col items-start">
                  <div className="flex w-full justify-between items-start mb-2">
                    {election.queued_access && (
                      <span className="text-xs px-2 py-1 rounded font-semibold shadow bg-yellow-200 text-yellow-800">
                        Queued Access
                        {typeof activeVoters[election.election_id] === 'number' && election.max_concurrent_voters ? (
                          <span className="ml-2 text-gray-700">{activeVoters[election.election_id]}/{election.max_concurrent_voters} active</span>
                        ) : null}
                      </span>
                    )}
                    <div className="self-end">{getStatusBadge(election)}</div>
                  </div>
                  {election.organization && (
                    <div className="text-xs text-gray-500 mt-2 mb-2">
                      {election.organization.org_name}
                      {election.organization.college_name && (
                        <span className="ml-2 text-gray-400">({election.organization.college_name})</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-6 pt-2 flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{election.election_name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{election.election_desc}</p>
                </div>
                <div className="px-6 pb-3 flex flex-col gap-1 items-start justify-between">
                  <span className="text-xs text-gray-500">
                    Ends on {new Date(election.date_end).toLocaleDateString()}
                  </span>
                  {getTimeRemainingBadge(election)}
                </div>
                <div className="px-6 pb-6">
                  <Link href={`/user/votes/access-check?election_id=${election.election_id}`}>
                    <button
                      className={`w-full mt-2 px-4 py-2 rounded-lg text-white font-semibold transition flex items-center justify-center gap-2 ${
                        status === 'Finished' ? 'bg-gray-500 cursor-not-allowed'
                        : status === 'Upcoming' ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700'
                      }`}
                      disabled={status === 'Finished' || status === 'Upcoming'}
                    >
                      {status === 'Finished'
                        ? 'Election Closed'
                        : status === 'Upcoming'
                          ? 'Voting Not Started'
                          : 'Cast Your Vote'}
                      {status === 'Ongoing' && <ArrowRight size={16} />}
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredElections.map((election) => {
            const status = computeElectionStatus(election);
            return (
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
                        {status === 'Finished' ? 'Ended on' : 'Ends on'} {new Date(election.date_end).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-3 mt-4 md:mt-0 md:ml-6">
                    {getTimeRemainingBadge(election)}
                    {election.queued_access && (
                      <span className="inline-block bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded">
                        Queued Access
                        {typeof activeVoters[election.election_id] === 'number' && election.max_concurrent_voters ? (
                          <span className="ml-2 text-gray-700">{activeVoters[election.election_id]}/{election.max_concurrent_voters} active</span>
                        ) : null}
                      </span>
                    )}
                    <Link href={`/user/votes/access-check?election_id=${election.election_id}`}>
                      <button 
                        className={`${
                          status === 'Finished' || status === 'Upcoming'
                            ? 'bg-gray-500 cursor-not-allowed' 
                            : 'bg-red-600 hover:bg-red-700'
                        } text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2`}
                        disabled={status === 'Finished' || status === 'Upcoming'}
                      >
                        {status === 'Finished'
                          ? 'Election Closed'
                          : status === 'Upcoming'
                            ? 'Voting Not Started'
                            : 'Cast Your Vote'} 
                        {status === 'Ongoing' && <ArrowRight size={16} />}
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </UserLayout>
  );
}