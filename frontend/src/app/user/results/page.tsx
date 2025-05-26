'use client';
import { useEffect, useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import UserSearchFilterBar from '@/components/user/UserSearchFilterBar';
import { Calendar, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import NothingIcon from '@/components/NothingIcon';
import jsPDF from 'jspdf';

interface ElectionResult {
  election_id: number;
  election_name: string;
  organization: string;
  ended_at: string;
  winner: string;
  total_votes: number;
  participation_rate: number;
  candidates: Array<{
    name: string;
    votes: number;
    percentage: number;
    winner: boolean;
  }>;
}

export default function UserResultsPage() {
  const { user } = useUser();  const [results, setResults] = useState<ElectionResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<ElectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [, setParticipatedElectionIds] = useState<Set<number>>(new Set());
  const [generatingPDFs, setGeneratingPDFs] = useState<Set<number>>(new Set());  const filterOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All Results' },
    { value: 'recent', label: 'Most Recent' },
    { value: 'highest-participation', label: 'Highest Participation' },
  ];

  const generateElectionPDF = async (election: ElectionResult) => {
    setGeneratingPDFs(prev => new Set([...prev, election.election_id]));
      try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;
      
      // Helper function to add new page if needed
      const checkPageBreak = (additionalHeight: number) => {
        if (yPosition + additionalHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };
      
      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Election Results Report', margin, yPosition);
      yPosition += 15;
      
      // Election Info
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(election.election_name, margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Organization: ${election.organization}`, margin, yPosition);
      yPosition += 6;
      
      pdf.text(`Ended: ${new Date(election.ended_at).toLocaleDateString()}`, margin, yPosition);
      yPosition += 10;
      
      // Statistics
      checkPageBreak(40);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Election Statistics', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const stats = [
        `Total Votes: ${election.total_votes.toLocaleString()}`,
        `Participation Rate: ${election.participation_rate}%`,
        `Overall Winner: ${election.winner}`
      ];
      
      stats.forEach(stat => {
        pdf.text(stat, margin, yPosition);
        yPosition += 6;
      });
      
      yPosition += 10;
      
      // Results
      checkPageBreak(30);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detailed Results', margin, yPosition);
      yPosition += 10;
      
      // Sort candidates by votes (descending)
      const sortedCandidates = [...election.candidates].sort((a, b) => b.votes - a.votes);
      
      sortedCandidates.forEach((candidate, idx) => {
        checkPageBreak(20);
        
        const rankText = `${idx + 1}. ${candidate.name}`;
        const voteText = `${candidate.votes.toLocaleString()} votes (${candidate.percentage}%)`;
        const winnerText = candidate.winner ? ' - WINNER' : '';
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', candidate.winner ? 'bold' : 'normal');
        pdf.text(rankText, margin + 5, yPosition);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(voteText + winnerText, margin + 5, yPosition + 5);
        
        yPosition += 15;
      });
      
      // Footer
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${totalPages}`,
          margin,
          pageHeight - 10
        );
      }
      
      // Download the PDF
      const fileName = `election-results-${election.election_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setGeneratingPDFs(prev => {
        const newSet = new Set(prev);
        newSet.delete(election.election_id);
        return newSet;
      });
    }
  };
  // Fetch election results and participated elections
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        // Fetch all finished elections with properly tallied results
        const res = await fetch(`${API_URL}/election_results`);
        const allResults: ElectionResult[] = await res.json();
        // Fetch user's votes to get participated election IDs
        let userElectionIds = new Set<number>();
        if (user && user.student_id) {
          const votesRes = await fetch(`${API_URL}/votes/by-voter/${user.student_id}`);
          if (votesRes.ok) {
            const votesData = await votesRes.json();
            userElectionIds = new Set<number>(
              (votesData.votes as Array<{ election_id: number }> || [])
                .map((v) => v.election_id)
            );
          }
        }
        setParticipatedElectionIds(userElectionIds);
        // Only show results for elections the user participated in
        const participatedResults = allResults.filter(r => userElectionIds.has(r.election_id));
        setResults(participatedResults);
        setFilteredResults(participatedResults);
        setLoading(false);      } catch (error: unknown) {
        console.error("Error fetching election results:", error);
        setLoading(false);
      }
    };
    fetchResults();
  }, [user, setParticipatedElectionIds]);
  // Filter results when search or filter changes
  useEffect(() => {
    let result = [...results];
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(item => 
        item.election_name.toLowerCase().includes(searchLower) || 
        item.organization.toLowerCase().includes(searchLower) ||
        item.candidates.some((candidate) => candidate.name.toLowerCase().includes(searchLower))
      );
    }    if (filter === 'recent') {
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

      {/* Results list */}      {loading ? (
        <div className="space-y-6">
          {Array.from({length: 2}, (_, i) => (
            <div key={`loading-skeleton-${i}`} className="bg-white rounded-xl shadow p-6 border border-gray-200 animate-pulse">
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
                    <div className="font-semibold text-gray-700">{result.winner}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 flex-1 min-w-[120px]">
                    <div className="text-sm text-green-700 mb-1">Total Votes</div>
                    <div className="font-semibold text-gray-700">{result.total_votes}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 flex-1 min-w-[120px]">
                    <div className="text-sm text-purple-700 mb-1">Participation</div>
                    <div className="font-semibold text-gray-700">{result.participation_rate}%</div>
                  </div>
                </div>
                
                <h4 className="font-medium text-gray-700 mb-3">Results Breakdown</h4>                <div className="space-y-3">
                  {result.candidates.map((candidate, idx: number) => (
                    <div key={`${result.election_id}-candidate-${idx}`} className="relative">
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
                  <button 
                    onClick={() => generateElectionPDF(result)}
                    disabled={generatingPDFs.has(result.election_id)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 disabled:text-gray-400"
                  >
                    <Download size={14} /> 
                    {generatingPDFs.has(result.election_id) ? 'Generating...' : 'Download PDF'}
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