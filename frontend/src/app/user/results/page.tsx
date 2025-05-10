'use client';
import { useEffect, useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import { Calendar, Search, Filter, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ElectionResult {
  election_id: number;
  election_name: string;
  organization: string;
  ended_at: string;
  winner: string;
  total_votes: number;
  participation_rate: number;
  candidates: {
    name: string;
    votes: number;
    percentage: number;
    winner: boolean;
  }[];
}

export default function UserResultsPage() {
  useUser();
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<ElectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'recent', 'highest-participation'

  // Fetch election results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        
        // For now, using mock data
        // This would be replaced with an actual API call
        // const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        // const response = await fetch(`${API_URL}/user/election-results`, {
        //   headers: { Authorization: `Bearer ${localStorage.getItem('voter_token')}` }
        // });
        // const data = await response.json();
        
        // Mock data
        const mockData: ElectionResult[] = [
          {
            election_id: 101,
            election_name: "Student Council President Election",
            organization: "Student Government Association",
            ended_at: "2024-04-15T23:59:59",
            winner: "Maria Rodriguez",
            total_votes: 1254,
            participation_rate: 78.4,
            candidates: [
              { name: "Maria Rodriguez", votes: 642, percentage: 51.2, winner: true },
              { name: "James Wilson", votes: 524, percentage: 41.8, winner: false },
              { name: "Sarah Thompson", votes: 88, percentage: 7.0, winner: false }
            ]
          },
          {
            election_id: 102,
            election_name: "Computer Science Club Leadership",
            organization: "CS Department",
            ended_at: "2024-03-22T18:00:00",
            winner: "David Chen",
            total_votes: 186,
            participation_rate: 62.0,
            candidates: [
              { name: "David Chen", votes: 98, percentage: 52.7, winner: true },
              { name: "Emily Jackson", votes: 88, percentage: 47.3, winner: false }
            ]
          },
          {
            election_id: 103,
            election_name: "Library Committee Representatives",
            organization: "University Library",
            ended_at: "2024-02-10T20:00:00",
            winner: "Multiple Winners",
            total_votes: 567,
            participation_rate: 42.3,
            candidates: [
              { name: "Michael Brown", votes: 230, percentage: 40.6, winner: true },
              { name: "Jennifer Davis", votes: 187, percentage: 33.0, winner: true },
              { name: "Robert Jones", votes: 150, percentage: 26.4, winner: false }
            ]
          }
        ];
        
        // Simulate API delay
        setTimeout(() => {
          setResults(mockData);
          setFilteredResults(mockData);
          setLoading(false);
        }, 800);
        
      } catch (error) {
        console.error("Error fetching election results:", error);
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  // Filter results when search or filter changes
  useEffect(() => {
    let result = [...results];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(item => 
        item.election_name.toLowerCase().includes(searchLower) || 
        item.organization.toLowerCase().includes(searchLower) ||
        item.candidates.some(candidate => candidate.name.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply category filter
    if (filter === 'recent') {
      result.sort((a, b) => new Date(b.ended_at).getTime() - new Date(a.ended_at).getTime());
    } else if (filter === 'highest-participation') {
      result.sort((a, b) => b.participation_rate - a.participation_rate);
    }
    
    setFilteredResults(result);
  }, [results, search, filter]);

  return (
    <UserLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Election Results</h1>
        <p className="text-gray-600 mt-2">
          View the outcomes of completed elections you participated in.
        </p>
      </div>
      
      {/* Search and filter controls */}
      <div className="bg-white rounded-xl shadow p-4 mb-8 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search results..."
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
              <option value="all">All Results</option>
              <option value="recent">Most Recent</option>
              <option value="highest-participation">Highest Participation</option>
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
      
      {/* Results list */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 border border-gray-200 animate-pulse">
              <div className="flex justify-between items-center mb-4">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-5 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="h-7 bg-gray-300 rounded w-2/3 mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 border border-gray-200 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17l4-4m0 0l-4-4m4 4H3m16-4v4m0 0v4m0-4h-8" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Results Found</h3>
          <p className="text-gray-600">
            {search ? 'Try adjusting your search or filters' : 'There are no election results available for you at this time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredResults.map((result) => (
            <div key={result.election_id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-600">{result.organization}</span>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-500 mr-1" />
                    <span className="text-xs text-gray-500">
                      Ended on {new Date(result.ended_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-3">{result.election_name}</h3>
                
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-3 flex-1 min-w-[120px]">
                    <div className="text-sm text-blue-700 mb-1">Winner</div>
                    <div className="font-semibold">{result.winner}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 flex-1 min-w-[120px]">
                    <div className="text-sm text-green-700 mb-1">Total Votes</div>
                    <div className="font-semibold">{result.total_votes}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 flex-1 min-w-[120px]">
                    <div className="text-sm text-purple-700 mb-1">Participation</div>
                    <div className="font-semibold">{result.participation_rate}%</div>
                  </div>
                </div>
                
                <h4 className="font-medium text-gray-700 mb-3">Results Breakdown</h4>
                <div className="space-y-3">
                  {result.candidates.map((candidate, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex justify-between mb-1">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-800">{candidate.name}</span>
                          {candidate.winner && (
                            <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              Winner
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-600">{candidate.votes} votes ({candidate.percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${candidate.winner ? 'bg-green-600' : 'bg-blue-500'}`}
                          style={{ width: `${candidate.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center mt-6">
                  <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
                    <Download size={14} /> Download PDF
                  </button>
                  <Link href={`/user/results/${result.election_id}`}>
                    <button className="flex items-center gap-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">
                      Detailed Results <ExternalLink size={14} />
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