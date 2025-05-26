'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import UserLayout from '@/layouts/UserLayout';
import { Calendar, Users, Trophy, CheckCircle, Download, ArrowLeft, Zap, Shield } from 'lucide-react';
import Link from 'next/link';
import NothingIcon from '@/components/NothingIcon';
import jsPDF from 'jspdf';

interface CandidateDetail {
  id: number;
  name: string;
  votes: number;
  percentage: number;
  winner: boolean;
  position_id: number;
  position_name: string;
}

interface PositionResult {
  position_id: number;
  position_name: string;
  candidates: CandidateDetail[];
}

interface ElectionDetail {
  election_id: number;
  election_name: string;
  organization: {
    org_name: string;
  } | null;
  status: string;
  published_at: string;
  description: string;
  participation_rate: number;
  voters_count: number;
  total_votes: number;
  crypto_enabled: boolean;
  threshold_crypto: boolean;
  zkp_verified: boolean;
  positions: PositionResult[];
  candidates: CandidateDetail[];
  result_count: number;
}

export default function ElectionDetailPage() {
  const params = useParams();
  const electionId = params.id;  const [electionDetail, setElectionDetail] = useState<ElectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const fetchElectionDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        
        const response = await fetch(`${API_URL}/election_results/${electionId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Election results not found');
          } else {
            setError('Failed to fetch election details');
          }
          return;
        }
        
        const data: ElectionDetail = await response.json();
        setElectionDetail(data);
      } catch (error) {
        console.error('Error fetching election details:', error);
        setError('An error occurred while fetching election details');
      } finally {
        setLoading(false);
      }
    };

    if (electionId) {
      fetchElectionDetail();
    }
  }, [electionId]);

  if (loading) {
    return (
      <UserLayout>
        <div className="animate-pulse">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-8">
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {Array.from({length: 4}, (_, i) => (
              <div key={i} className="bg-white rounded-xl shadow border border-gray-200 p-4">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </UserLayout>
    );
  }

  if (error || !electionDetail) {
    return (
      <UserLayout>
        <div className="bg-white rounded-xl shadow p-8 border border-gray-200 text-center">
          <NothingIcon width={80} height={80} className="mb-4 mx-auto" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {error || 'Election not found'}
          </h3>
          <p className="text-gray-600 mb-4">
            The election details you&apos;re looking for could not be loaded.
          </p>
          <Link href="/user/results">
            <button className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              <ArrowLeft size={16} />
              Back to Results
            </button>
          </Link>
        </div>
      </UserLayout>
    );
  }
  const getWinnersCount = () => {
    return electionDetail.positions.reduce((count, position) => {
      const winners = position.candidates.filter(c => c.winner);
      return count + winners.length;
    }, 0);
  };

  const generatePDFReport = async () => {
    if (!electionDetail) return;
    
    setIsGeneratingPDF(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
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
      pdf.text(electionDetail.election_name, margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      if (electionDetail.organization?.org_name) {
        pdf.text(`Organization: ${electionDetail.organization.org_name}`, margin, yPosition);
        yPosition += 6;
      }
      
      pdf.text(`Status: ${electionDetail.status}`, margin, yPosition);
      yPosition += 6;
      
      pdf.text(`Published: ${new Date(electionDetail.published_at).toLocaleDateString()}`, margin, yPosition);
      yPosition += 6;
      
      if (electionDetail.description) {
        const descriptionLines = pdf.splitTextToSize(electionDetail.description, pageWidth - 2 * margin);
        pdf.text(descriptionLines, margin, yPosition);
        yPosition += descriptionLines.length * 6;
      }
      
      yPosition += 5;
      
      // Statistics
      checkPageBreak(40);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Election Statistics', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const stats = [
        `Total Votes: ${electionDetail.total_votes.toLocaleString()}`,
        `Registered Voters: ${electionDetail.voters_count.toLocaleString()}`,
        `Participation Rate: ${electionDetail.participation_rate}%`,
        `Winners: ${getWinnersCount()}`
      ];
      
      stats.forEach(stat => {
        pdf.text(stat, margin, yPosition);
        yPosition += 6;
      });
      
      yPosition += 5;
      
      // Security Features (if any)
      if (electionDetail.crypto_enabled || electionDetail.threshold_crypto || electionDetail.zkp_verified) {
        checkPageBreak(30);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Security Features', margin, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        
        if (electionDetail.crypto_enabled) {
          pdf.text('• Encryption Enabled', margin, yPosition);
          yPosition += 6;
        }
        if (electionDetail.threshold_crypto) {
          pdf.text('• Threshold Cryptography', margin, yPosition);
          yPosition += 6;
        }
        if (electionDetail.zkp_verified) {
          pdf.text('• Zero-Knowledge Proof Verified', margin, yPosition);
          yPosition += 6;
        }
        
        yPosition += 5;
      }
        // Results by Position
      electionDetail.positions.forEach((position) => {
        checkPageBreak(60);
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Position: ${position.position_name}`, margin, yPosition);
        yPosition += 8;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const positionStats = `${position.candidates.length} candidate${position.candidates.length !== 1 ? 's' : ''} • ${position.candidates.reduce((sum, c) => sum + c.votes, 0)} total votes`;
        pdf.text(positionStats, margin, yPosition);
        yPosition += 10;
        
        // Sort candidates by votes (descending)
        const sortedCandidates = [...position.candidates].sort((a, b) => b.votes - a.votes);
        
        sortedCandidates.forEach((candidate, idx) => {
          checkPageBreak(15);
          
          const rankText = `${idx + 1}. ${candidate.name}`;
          const voteText = `${candidate.votes.toLocaleString()} votes (${candidate.percentage}%)`;
          const winnerText = candidate.winner ? ' - WINNER' : '';
          
          pdf.setFont('helvetica', candidate.winner ? 'bold' : 'normal');
          pdf.text(rankText, margin + 5, yPosition);
          
          pdf.setFont('helvetica', 'normal');
          pdf.text(voteText + winnerText, margin + 5, yPosition + 5);
          
          yPosition += 12;
        });
        
        yPosition += 5;
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
      const fileName = `election-results-${electionDetail.election_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <UserLayout>
      {/* Header */}
      <div className="mb-8">
        <Link href="/user/results">
          <button className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft size={16} />
            Back to Results
          </button>
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Detailed Election Results
        </h1>
        <p className="text-gray-600">
          Complete breakdown of election results including all positions and candidates.
        </p>
      </div>

      {/* Election Info Card */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-1">
              {electionDetail.election_name}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{electionDetail.organization?.org_name || 'Unknown Organization'}</span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                Published {new Date(electionDetail.published_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              electionDetail.status === 'Finished' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {electionDetail.status}
            </span>
          </div>
        </div>
        
        {electionDetail.description && (
          <p className="text-gray-700 mb-4">{electionDetail.description}</p>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Votes</p>
              <p className="text-2xl font-bold text-gray-900">{electionDetail.total_votes.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Participation Rate</p>
              <p className="text-2xl font-bold text-gray-900">{electionDetail.participation_rate}%</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Winners</p>
              <p className="text-2xl font-bold text-gray-900">{getWinnersCount()}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Trophy className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Registered Voters</p>
              <p className="text-2xl font-bold text-gray-900">{electionDetail.voters_count.toLocaleString()}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Security Features */}
      {(electionDetail.crypto_enabled || electionDetail.threshold_crypto || electionDetail.zkp_verified) && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Security Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {electionDetail.crypto_enabled && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Encryption Enabled</span>
              </div>
            )}
            {electionDetail.threshold_crypto && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Zap className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Threshold Cryptography</span>
              </div>
            )}
            {electionDetail.zkp_verified && (
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">ZKP Verified</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results by Position */}
      <div className="space-y-8">
        {electionDetail.positions.map((position) => (
          <div key={position.position_id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">{position.position_name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {position.candidates.length} candidate{position.candidates.length !== 1 ? 's' : ''} • 
                {position.candidates.reduce((sum, c) => sum + c.votes, 0)} total votes
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {position.candidates
                  .sort((a, b) => b.votes - a.votes)
                  .map((candidate, idx) => (
                  <div key={candidate.id} className="relative">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          candidate.winner 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{candidate.name}</span>
                            {candidate.winner && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                <Trophy size={12} />
                                Winner
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {candidate.votes.toLocaleString()} votes
                        </div>
                        <div className="text-sm text-gray-600">
                          {candidate.percentage}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          candidate.winner ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${candidate.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-between items-center">
        <Link href="/user/results">
          <button className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <ArrowLeft size={16} />
            Back to All Results
          </button>
        </Link>
          <button 
          onClick={generatePDFReport}
          disabled={isGeneratingPDF}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg"
        >
          <Download size={16} />
          {isGeneratingPDF ? 'Generating PDF...' : 'Download Report'}
        </button>
      </div>
    </UserLayout>
  );
}
