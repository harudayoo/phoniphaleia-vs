'use client';
import { useEffect, useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import { Calendar, Eye } from 'lucide-react';
import Link from 'next/link';
import UserSearchFilterBar from '@/components/user/UserSearchFilterBar';
import NothingIcon from '@/components/NothingIcon';

interface VotingHistory {
  election_id: number;
  election_name: string;
  organization: string;
  voted_at: string;
  status: 'completed' | 'ongoing' | 'cancelled';
  has_results: boolean;
}

interface ElectionInfo {
  election_id: number;
  election_name: string;
  election_status: string;
  organization?: { org_name: string };
}

export default function UserHistoryPage() {
  useUser();
  const [history, setHistory] = useState<VotingHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<VotingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'ongoing', 'cancelled'

  const filterOptions = [
    { value: 'all', label: 'All Votes' },
    { value: 'completed', label: 'Completed Elections' },
    { value: 'ongoing', label: 'Ongoing Elections' },
    { value: 'cancelled', label: 'Cancelled Elections' },
  ];

  // Fetch voting history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.student_id) {
          setHistory([]);
          setFilteredHistory([]);
          setLoading(false);
          return;
        }
        // Fetch all votes for this user
        const votesRes = await fetch(`${API_URL}/votes/by-voter/${user.student_id}`);
        const votesData = await votesRes.json();
        const votes: Array<{ election_id: number; cast_time: string }> = votesData.votes || [];
        // Fetch all elections (for names, org, status)
        const electionsRes = await fetch(`${API_URL}/elections`);
        const electionsData: ElectionInfo[] = await electionsRes.json();
        // Map election_id to election info
        const electionMap: Record<number, ElectionInfo> = {};
        for (const e of electionsData) {
          electionMap[e.election_id] = e;
        }
        // Compose history (deduplicate by election_id, use latest voted_at)
        const electionHistoryMap = new Map<number, VotingHistory>();
        for (const v of votes) {
          const election = electionMap[v.election_id];
          let status: VotingHistory['status'] = 'completed';
          if (election) {
            if (election.election_status === 'Ongoing') status = 'ongoing';
            else if (election.election_status === 'Canceled') status = 'cancelled';
            else if (election.election_status === 'Finished') status = 'completed';
          }
          const prev = electionHistoryMap.get(v.election_id);
          // Use the latest voted_at (max date)
          if (!prev || new Date(v.cast_time).getTime() > new Date(prev.voted_at).getTime()) {
            electionHistoryMap.set(v.election_id, {
              election_id: v.election_id,
              election_name: election ? election.election_name : 'Unknown',
              organization: election && election.organization ? election.organization.org_name : 'Unknown',
              voted_at: v.cast_time || '',
              status,
              has_results: election ? election.election_status === 'Finished' : false
            });
          }
        }
        const historyData: VotingHistory[] = Array.from(electionHistoryMap.values());
        setHistory(historyData);
        setFilteredHistory(historyData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching voting history:', error);
        setHistory([]);
        setFilteredHistory([]);
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Filter history when search or filter changes
  useEffect(() => {
    let result = [...history];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(item => 
        item.election_name.toLowerCase().includes(searchLower) || 
        item.organization.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (filter !== 'all') {
      result = result.filter(item => item.status === filter);
    }
    
    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.voted_at).getTime() - new Date(a.voted_at).getTime());
    
    setFilteredHistory(result);
  }, [history, search, filter]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completed</span>;
      case 'ongoing':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Ongoing</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <UserLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Voting History</h1>
        <p className="text-gray-600 mt-2">
          View a record of all elections you have participated in.
        </p>
      </div>

      <UserSearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        filterValue={filter}
        onFilterChange={setFilter}
        filterOptions={filterOptions}
        searchPlaceholder="Search history..."
      />

      {/* History list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 border border-gray-200 animate-pulse">
              <div className="flex justify-between items-center mb-4">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-5 bg-gray-200 rounded-full w-20"></div>
              </div>
              <div className="h-7 bg-gray-300 rounded w-2/3 mb-4"></div>
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 border border-gray-200 text-center">
          <NothingIcon width={80} height={80} className="mb-4 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Voting History Found</h3>
          <p className="text-gray-600">
            {search || filter !== 'all' ? 'Try adjusting your search or filters' : 'You have not participated in any elections yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <div key={`${item.election_id}-${item.voted_at}`} className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">{item.organization}</span>
                {getStatusBadge(item.status)}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{item.election_name}</h3>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600">
                    Voted on {new Date(item.voted_at).toLocaleDateString()} at {new Date(item.voted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                {item.has_results && (
                  <Link href={`/user/results/${item.election_id}`}>
                    <button className="flex items-center gap-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">
                      <Eye size={16} /> View Results
                    </button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </UserLayout>
  );
}