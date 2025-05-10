'use client';
import { useEffect, useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import { Calendar, Search, Filter, Eye } from 'lucide-react';
import Link from 'next/link';

interface VotingHistory {
  election_id: number;
  election_name: string;
  organization: string;
  voted_at: string;
  status: 'completed' | 'ongoing' | 'cancelled';
  has_results: boolean;
}

export default function UserHistoryPage() {
  useUser();
  const [history, setHistory] = useState<VotingHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<VotingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'ongoing', 'cancelled'

  // Fetch voting history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        
        // For now, using mock data
        // This would be replaced with an actual API call
        // const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        // const response = await fetch(`${API_URL}/user/voting-history`, {
        //   headers: { Authorization: `Bearer ${localStorage.getItem('voter_token')}` }
        // });
        // const data = await response.json();
        
        // Mock data
        const mockData: VotingHistory[] = [
          {
            election_id: 1,
            election_name: "Student Council Election 2024",
            organization: "Student Affairs Office",
            voted_at: "2024-03-15T14:30:00",
            status: "completed",
            has_results: true
          },
          {
            election_id: 2,
            election_name: "Department Representative Selection",
            organization: "Computer Science Department",
            voted_at: "2024-04-05T11:20:00",
            status: "completed",
            has_results: true
          },
          {
            election_id: 3,
            election_name: "Student Activity Budget Allocation",
            organization: "Student Government",
            voted_at: "2025-01-10T09:45:00",
            status: "ongoing",
            has_results: false
          },
          {
            election_id: 4,
            election_name: "Library Committee Election",
            organization: "University Library",
            voted_at: "2024-02-22T16:15:00",
            status: "cancelled",
            has_results: false
          },
          {
            election_id: 5,
            election_name: "Sports Committee Election",
            organization: "Sports Department",
            voted_at: "2024-05-07T10:30:00",
            status: "completed",
            has_results: true
          }
        ];
        
        // Simulate API delay
        setTimeout(() => {
          setHistory(mockData);
          setFilteredHistory(mockData);
          setLoading(false);
        }, 800);
        
      } catch (error) {
        console.error("Error fetching voting history:", error);
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
      
      {/* Search and filter controls */}
      <div className="bg-white rounded-xl shadow p-4 mb-8 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search history..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <select
              className="appearance-none bg-white border border-gray-300 rounded-lg pl-10 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Votes</option>
              <option value="completed">Completed Elections</option>
              <option value="ongoing">Ongoing Elections</option>
              <option value="cancelled">Cancelled Elections</option>
            </select>
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
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
          <div className="text-gray-400 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Voting History Found</h3>
          <p className="text-gray-600">
            {search || filter !== 'all' ? 'Try adjusting your search or filters' : 'You have not participated in any elections yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <div key={item.election_id} className="bg-white rounded-xl shadow border border-gray-200 p-6">
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