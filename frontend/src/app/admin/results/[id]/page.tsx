'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/layouts/AdminLayout';
import PageHeader from '@/components/admin/PageHeader';
import { Download, FileCheck, ArrowLeft, Key, Shield } from 'lucide-react';
import Link from 'next/link';

// Import our components (to be displayed when they're fully implemented)
import DecryptionPanel from '@/components/admin/DecryptionPanel';
import ZKPVerificationPanel from '@/components/admin/ZKPVerificationPanel';

interface ResultDetail {
  result_id: number;
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
  }[];
}

export default function AdminResultDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const resultId = parseInt(params.id, 10);
  
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'decryption' | 'verification'>('overview');
  const [, setDecrypted] = useState(false);

  useEffect(() => {
    const fetchResultDetail = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, fetch from API
        // const response = await fetch(`/api/results/${resultId}`);
        // const data = await response.json();
          // Mock data for demonstration
        const mockData: ResultDetail = {
          result_id: resultId,
          election_id: 123,
          election_name: "Student Council Election 2025",
          organization: { org_name: "Student Affairs Office" },
          status: "Published",
          published_at: "2025-04-05T14:30:00",
          description: "Official results for the 2025 student council election",
          participation_rate: 78.4,
          voters_count: 1802,
          total_votes: 1412,
          // Add crypto properties
          crypto_enabled: true,
          threshold_crypto: true,
          zkp_verified: true,
          candidates: [
            { id: 1, name: "Maria Rodriguez", votes: 642, percentage: 45.5, winner: true },
            { id: 2, name: "James Wilson", votes: 524, percentage: 37.1, winner: false },
            { id: 3, name: "Sarah Thompson", votes: 246, percentage: 17.4, winner: false }
          ]
        };
        
        setTimeout(() => {
          setResult(mockData);
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error("Error fetching result detail:", error);
        setLoading(false);
      }
    };

    fetchResultDetail();
  }, [resultId]);
  const handleDecryptionComplete = (results: { success: boolean; results: Array<{ position_id: number; candidate_results: Record<string, number> }> }) => {
    setDecrypted(true);
    // In a real implementation, update the result state with the decrypted results
    console.log('Decryption results:', results);
    
    // Update the candidate results with decrypted data
    if (results.success && result) {
      // Here we would map the decrypted results to the candidate list
      // For this demo, we're just logging the results
    }
  };

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

  const renderTabContent = () => {
    if (!result) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* General Information */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">General Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">                <div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">Election Name</div>
                    <div className="font-medium">{result.election_name}</div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">Organization</div>
                    <div className="font-medium">{result.organization?.org_name}</div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">Description</div>
                    <div>{result.description || 'No description provided'}</div>
                  </div>
                  
                  {/* Cryptography details */}
                  {result.crypto_enabled && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Cryptography</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {result.threshold_crypto && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center">
                            <Key className="h-3 w-3 mr-1" />
                            Threshold Cryptography
                          </span>
                        )}
                        {result.zkp_verified && (
                          <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full flex items-center">
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
                    <div className="text-sm text-gray-600 mb-1">Status</div>
                    <div>{getStatusBadge(result.status)}</div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">Published Date</div>
                    <div>{new Date(result.published_at).toLocaleDateString()}</div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">Result ID</div>
                    <div className="font-mono">{result.result_id}</div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">Election ID</div>
                    <div className="font-mono">{result.election_id}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-md p-4">
                  <div className="text-sm text-blue-700 mb-1">Total Voters</div>
                  <div className="text-2xl font-bold">{result.voters_count?.toLocaleString()}</div>
                </div>
                <div className="bg-green-50 rounded-md p-4">
                  <div className="text-sm text-green-700 mb-1">Votes Cast</div>
                  <div className="text-2xl font-bold">{result.total_votes?.toLocaleString()}</div>
                </div>
                <div className="bg-amber-50 rounded-md p-4">
                  <div className="text-sm text-amber-700 mb-1">Participation</div>
                  <div className="text-2xl font-bold">{result.participation_rate}%</div>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Candidate Results</h3>
              {result.candidates && result.candidates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Candidate
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Votes
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Percentage
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.candidates
                        .sort((a, b) => b.votes - a.votes)
                        .map((candidate, index) => (
                          <tr key={candidate.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium">{index + 1}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium">{candidate.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm">{candidate.votes.toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm">{candidate.percentage}%</div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div 
                                  className="bg-blue-600 h-1.5 rounded-full" 
                                  style={{ width: `${candidate.percentage}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {candidate.winner ? (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  Winner
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                  Not Elected
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">No candidates data available</div>
              )}
            </div>
          </div>
        );

      case 'decryption':
        return (
          <DecryptionPanel 
            electionId={result.election_id} 
            onDecryptionComplete={handleDecryptionComplete} 
          />
        );

      case 'verification':
        return (
          <ZKPVerificationPanel electionId={result.election_id} />
        );

      default:
        return null;
    }
  };

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
        description={`Viewing detailed results for ${result.election_name}`}
        action={
          <div className="flex space-x-2">
            <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
              <FileCheck className="h-4 w-4 mr-2" />
              Publish
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'border-b-2 border-red-800 text-red-800'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('decryption')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'decryption'
                  ? 'border-b-2 border-red-800 text-red-800'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Threshold Decryption
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'verification'
                  ? 'border-b-2 border-red-800 text-red-800'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ZKP Verification
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </AdminLayout>
  );
}
