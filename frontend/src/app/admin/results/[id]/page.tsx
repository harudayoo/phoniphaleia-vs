'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/layouts/AdminLayout';
import PageHeader from '@/components/admin/PageHeader';
import { Download, ArrowLeft, Key, Shield } from 'lucide-react';
import Link from 'next/link';

// API URL for fetching data
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ResultDetail {
  election_id: number;
  election_name: string;
  organization?: { org_name: string };
  status: string;
  published_at: string;
  description?: string;
  participation_rate?: number;
  voters_count?: number;
  total_votes?: number;
  crypto_enabled?: boolean;
  threshold_crypto?: boolean;
  zkp_verified?: boolean;
  candidates?: {
    id: number;
    name: string;
    votes: number;
    percentage: number;
    winner: boolean;
    position_id?: number;
    position_name?: string;
  }[];
  positions?: {
    position_id: number;
    position_name: string;
    candidates: {
      id: number;
      name: string;
      votes: number;
      percentage: number;
      winner: boolean;
    }[];
  }[];
}

interface ExportData {
  election_name: string;
  election_id: number;
  organization?: string;
  status: string;
  published_at: string;
  voters_count?: number;
  total_votes?: number;
  participation_rate?: number;
  positions?: {
    position_name: string;
    candidates: {
      name: string;
      votes: number;
      percentage: number;
      winner: boolean;
    }[];
  }[];
}

export default function AdminResultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // Unwrap params using React.use()
  const resolvedParams = React.use(params);  const [resultId, setResultId] = useState<number | null>(null);
  const [result, setResult] = useState<ResultDetail | null>(null);  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Initialize resultId from params when the component mounts
  useEffect(() => {
    if (resolvedParams.id) {
      setResultId(parseInt(resolvedParams.id, 10));
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    const fetchResultDetail = async () => {
      if (!resultId) return; // Don't fetch if resultId is not set yet
      
      try {
        setLoading(true);
        // Fetch real data from the backend
        const response = await fetch(`${API_URL}/election_results/${resultId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch result with ID ${resultId}`);
        }
        const data = await response.json();
        
        setResult(data);
      } catch (error) {
        console.error("Error fetching result detail:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResultDetail();
  }, [resultId]);
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

  const handleExport = async () => {
    if (!result) return;
    
    try {
      setIsExporting(true);
      
      // Prepare export data
      const exportData = {
        election_name: result.election_name,
        election_id: result.election_id,
        organization: result.organization?.org_name,
        status: result.status,
        published_at: result.published_at,
        voters_count: result.voters_count,
        total_votes: result.total_votes,
        participation_rate: result.participation_rate,
        positions: result.positions?.map(position => ({
          position_name: position.position_name,
          candidates: position.candidates.map(candidate => ({
            name: candidate.name,
            votes: candidate.votes,
            percentage: candidate.percentage,
            winner: candidate.winner
          }))
        }))
      };

      // Create and download CSV
      const csvContent = generateCSV(exportData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `election_results_${result.election_id}_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Failed to export results. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  const generateCSV = (data: ExportData) => {
    let csv = 'Election Information\n';
    csv += `Election Name,${data.election_name}\n`;
    csv += `Election ID,${data.election_id}\n`;
    csv += `Organization,${data.organization || 'N/A'}\n`;
    csv += `Status,${data.status}\n`;
    csv += `Published Date,${new Date(data.published_at).toLocaleDateString()}\n`;
    csv += `Total Voters,${data.voters_count || 0}\n`;
    csv += `Total Votes,${data.total_votes || 0}\n`;
    csv += `Participation Rate,${data.participation_rate ? (data.participation_rate * 100).toFixed(2) + '%' : 'N/A'}\n\n`;

    if (data.positions && data.positions.length > 0) {
      csv += 'Results by Position\n';
      
      data.positions.forEach((position) => {
        csv += `\nPosition: ${position.position_name}\n`;
        csv += 'Rank,Candidate Name,Votes,Percentage,Status\n';
        
        position.candidates
          .sort((a, b) => b.votes - a.votes)
          .forEach((candidate, index) => {
            csv += `${index + 1},${candidate.name},${candidate.votes},${candidate.percentage.toFixed(1)}%,${candidate.winner ? 'Elected' : 'Runner-up'}\n`;
          });
      });
    }
    
    return csv;  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-800 mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading result details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!result) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium">Result not found</p>
            <p className="mt-2 text-gray-600">The result you are looking for does not exist or has been removed.</p>
            <button 
              onClick={() => router.push('/admin/results')}
              className="mt-4 px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700"
            >
              Back to Results
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <Link href="/admin/results" className="inline-flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Results
        </Link>
      </div>

      <PageHeader 
        title={result.election_name} 
        description={`Viewing detailed results for ${result.election_name}`}        action={
          <div className="flex space-x-2">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 border border-gray-300 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>            {/* Archive button removed due to authorization issues */}
          </div>
        }
      />

      <div className="space-y-8">
        {/* General Information */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">General Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <div className="text-sm text-gray-700 font-medium mb-1">Election Name</div>
                <div className="font-medium text-gray-900">{result.election_name}</div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-gray-700 font-medium mb-1">Organization</div>
                <div className="font-medium text-gray-900">{result.organization?.org_name}</div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-gray-700 font-medium mb-1">Description</div>
                <div className="text-gray-800">{result.description || 'No description provided'}</div>
              </div>
              {/* Cryptography details */}
              {result.crypto_enabled && (
                <div className="mb-4">
                  <div className="text-sm text-gray-700 font-medium mb-1">Cryptography</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {result.threshold_crypto && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center">
                        <Key className="h-3 w-3 mr-1" />
                        Threshold Cryptography
                      </span>
                    )}
                    {result.zkp_verified && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        ZKP Verified
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="mb-4">
                <div className="text-sm text-gray-700 font-medium mb-1">Status</div>
                <div>{getStatusBadge(result.status)}</div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-gray-700 font-medium mb-1">Published Date</div>
                <div className="text-gray-900">{new Date(result.published_at).toLocaleDateString()}</div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-gray-700 font-medium mb-1">Election ID</div>
                <div className="font-mono text-gray-900">{result.election_id}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-md p-4">
              <div className="text-sm text-blue-800 font-medium mb-1">Total Voters</div>
              <div className="text-2xl font-bold text-blue-900">{result.voters_count?.toLocaleString()}</div>
            </div>
            <div className="bg-green-50 rounded-md p-4">
              <div className="text-sm text-green-800 font-medium mb-1">Votes Cast</div>
              <div className="text-2xl font-bold text-green-900">{result.total_votes?.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Results by Position */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Election Results by Position</h3>
          {result.positions && result.positions.length > 0 ? (
            <div className="space-y-8">
              {result.positions.map((position) => (
                <div key={position.position_id} className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0">
                  <h4 className="text-md font-semibold mb-4 text-gray-700">{position.position_name}</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Rank
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Candidate
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Votes
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Percentage
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {position.candidates
                          .sort((a, b) => b.votes - a.votes)
                          .map((candidate, index) => (
                            <tr key={candidate.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{index + 1}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{candidate.votes.toLocaleString()}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{candidate.percentage.toFixed(1)}%</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {candidate.winner ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                    Elected
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                                    Runner-up
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-700 font-medium">No results data available</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
