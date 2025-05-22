'use client';
import { useEffect, useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import UserSearchFilterBar from '@/components/user/UserSearchFilterBar';
import { Calendar, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import NothingIcon from '@/components/NothingIcon';

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
  const { user } = useUser();
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<ElectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'recent', 'highest-participation'
  const [, setParticipatedElectionIds] = useState<Set<number>>(new Set());

  const filterOptions = [
    { value: 'all', label: 'All Results' },
    { value: 'recent', label: 'Most Recent' },
    { value: 'highest-participation', label: 'Highest Participation' },
  ];

  // Fetch election results and participated elections
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        // Fetch all finished elections with results
        const res = await fetch(`${API_URL}/election-results`);
        const allResults: ElectionResult[] = await res.json();
        // Fetch user's votes to get participated election IDs
        let userElectionIds = new Set<number>();
        if (user && user.student_id) {
          const votesRes = await fetch(`${API_URL}/votes/by-voter/${user.student_id}`);
          if (votesRes.ok) {
            const votesData = await votesRes.json();
            userElectionIds = new Set<number>((votesData.votes || []).map((v: { election_id: number }) => v.election_id));
          }
        }
        setParticipatedElectionIds(userElectionIds);
        // Only show results for elections the user participated in
        const participatedResults = allResults.filter(r => userElectionIds.has(r.election_id));
        setResults(participatedResults);
        setFilteredResults(participatedResults);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching election results:", error);
        setLoading(false);
      }
    };
    fetchResults();
  }, [user]);

  // Filter results when search or filter changes
  useEffect(() => {
    let result = [...results];
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(item => 
        item.election_name.toLowerCase().includes(searchLower) || 
        item.organization.toLowerCase().includes(searchLower) ||
        item.candidates.some(candidate => candidate.name.toLowerCase().includes(searchLower))
      );
    }
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

      <UserSearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        filterValue={filter}
        onFilterChange={setFilter}
        filterOptions={filterOptions}
        searchPlaceholder="Search results..."
      />

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
          <NothingIcon width={80} height={80} className="mb-4 mx-auto" />
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