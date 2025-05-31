"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Loader4 from "@/components/Loader4";
import AdminLayout from "@/layouts/AdminLayout";
import ArrowUpScrollToTop from "@/components/ArrowUpScrollToTop";
import { FaDownload, FaShareAlt, FaArrowLeft, FaChartBar, FaCheckCircle, FaTrophy, FaFilePdf } from "react-icons/fa";
import jsPDF from 'jspdf';

interface Candidate {
  candidate_id: number;
  fullname: string;
  party?: string;
  vote_count: number;
  is_winner: boolean;
}

interface PositionResult {
  position_id: number;
  position_name: string;
  candidates: Candidate[];
}

interface PDFCandidate {
  candidate_id: number;
  fullname: string;
  party?: string;
  vote_count: number;
  is_winner: boolean;
  rank: number;
  percentage: number;
}

interface PDFPosition {
  position_id: number;
  position_name: string;
  candidates: PDFCandidate[];
  total_votes: number;
}

interface PDFData {
  election_name: string;
  election_id: number;
  total_voters: number;
  total_votes: number;
  participation_rate: number;
  generation_date: string;
  generation_timestamp: string;
  positions: PDFPosition[];
  winners: Array<{
    fullname: string;
    party?: string;
    position_name: string;
    vote_count: number;
  }>;
  is_verified: boolean;
  verification_message: string;
}

function DecryptedResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const election_id = searchParams?.get("election_id");
  const [results, setResults] = useState<PositionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [autoPdfGenerated, setAutoPdfGenerated] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    verified: boolean;
    vote_count_match: boolean;
    total_decrypted: number;
    message?: string;
  } | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Handle scroll detection for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollToTop(window.scrollY > 80);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);  // Automatic PDF generation when page loads
  useEffect(() => {
    if (!election_id || loading || error || autoPdfGenerated || results.length === 0) return;
    
    // Only auto-generate PDF after results are loaded successfully
    const generateAutoPdf = async () => {
      try {
        const response = await fetch(`${API_URL}/election_results/${election_id}/pdf`);
        if (!response.ok) {
          throw new Error('Failed to fetch PDF data');
        }
        
        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error('Invalid PDF data received');
        }
        
        const pdfData: PDFData = result.data;
        
        // Generate PDF using the centralized helper function
        const pdf = generateFormattedPDF(pdfData);
        
        // Download the PDF
        const fileName = `election-results-${pdfData.election_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        console.log('PDF automatically generated and downloaded');
        setAutoPdfGenerated(true);
        
      } catch (error) {
        console.error('Error auto-generating PDF:', error);
      }
    };
    
    generateAutoPdf();
  }, [results, loading, error, election_id, autoPdfGenerated, API_URL]);

  useEffect(() => {
    if (!election_id) return;
    setLoading(true);
    fetch(`${API_URL}/election_results/${election_id}/decrypted`)
      .then(async (res) => {
        if (!res.ok) {
          // Handle error if the response is not valid JSON
          const errorText = await res.text();
          let errorMessage = "Failed to fetch decrypted results";
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            // If parsing fails, use the text as the error message if it exists
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Received decrypted results:", data);
        setResults(data.results || []);
        
        // Check for and display verification status if available
        if (data.verification_status) {
          setVerificationStatus(data.verification_status);
        }
        
        setLoading(false);
      })
      .catch((e) => {
        console.error("Error fetching decrypted results:", e);
        setError(e.message);
        setLoading(false);
      });
  }, [election_id, API_URL]);

  // Export as CSV
  const handleExport = () => {
    const csvData = [
      "Position,Candidate,Party,Vote Count,Winner"
    ];
    
    results.forEach(position => {
      if (position.candidates && Array.isArray(position.candidates)) {
        position.candidates.forEach(candidate => {
          if (candidate) {
            csvData.push(
              `"${position.position_name || ''}","${candidate.fullname || ''}","${candidate.party || ''}",${candidate.vote_count || 0},${candidate.is_winner ? 'Yes' : 'No'}`
            );
          }
        });
      }
    });
    
    const csv = csvData.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decrypted_results_${election_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  // Generate formatted PDF with letterhead space and centered content
  const generateFormattedPDF = (pdfData: PDFData) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20; // Increased margin for better layout
    const letterheadSpace = 60; // Increased space for pre-printed letterhead (60mm = ~2.4 inches)
    let yPosition = letterheadSpace; // Start content below letterhead area
    
    // Helper function to add new page if needed
    const checkPageBreak = (additionalHeight: number) => {
      if (yPosition + additionalHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = letterheadSpace; // Reset to letterhead space on new pages
        return true;
      }
      return false;
    };
    
    // Helper function to center text horizontally
    const centerText = (text: string, y: number, fontSize: number = 12) => {
      pdf.setFontSize(fontSize);
      const textWidth = pdf.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;
      pdf.text(text, x, y);
    };
      // Add letterhead area indicator with better styling
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.5);
    pdf.line(margin, letterheadSpace - 8, pageWidth - margin, letterheadSpace - 8);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(180, 180, 180);
    centerText('← Reserved for Pre-printed Letterhead/Header →', letterheadSpace - 12, 10);
    pdf.setTextColor(0, 0, 0); // Reset to black
    
    // Header - Centered
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    centerText('Election Results Report', yPosition, 22);
    yPosition += 18;
    
    // Election Info - Centered
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    centerText(pdfData.election_name, yPosition, 18);
    yPosition += 10;
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    centerText(`Election ID: ${pdfData.election_id}`, yPosition, 12);
    yPosition += 8;
    
    centerText(`Generated: ${pdfData.generation_date}`, yPosition, 12);
    yPosition += 15;
    
    // Statistics - Centered
    checkPageBreak(40);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    centerText('Election Statistics', yPosition, 16);
    yPosition += 12;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    const stats = [
      `Total Votes: ${pdfData.total_votes.toLocaleString()}`,
      `Registered Voters: ${pdfData.total_voters.toLocaleString()}`,
      `Participation Rate: ${pdfData.participation_rate}%`,
      `Winners: ${pdfData.winners.length}`
    ];
    
    stats.forEach(stat => {
      centerText(stat, yPosition, 11);
      yPosition += 6;
    });
    
    yPosition += 8;
    
    // Results by Position - Left aligned but with better spacing
    pdfData.positions.forEach((position) => {
      checkPageBreak(60);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      centerText(`Position: ${position.position_name}`, yPosition, 14);
      yPosition += 8;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const positionStats = `${position.candidates.length} candidate${position.candidates.length !== 1 ? 's' : ''} • ${position.total_votes} total votes`;
      centerText(positionStats, yPosition, 11);
      yPosition += 10;
      
      // Sort candidates by rank
      const sortedCandidates = [...position.candidates].sort((a, b) => a.rank - b.rank);
      
      sortedCandidates.forEach((candidate) => {
        checkPageBreak(15);
        
        const rankText = `${candidate.rank}. ${candidate.fullname}`;
        const voteText = `${candidate.vote_count.toLocaleString()} votes (${candidate.percentage}%)`;
        const partyText = candidate.party ? ` - ${candidate.party}` : '';
        const winnerText = candidate.is_winner ? ' - WINNER' : '';
        
        pdf.setFont('helvetica', candidate.is_winner ? 'bold' : 'normal');
        pdf.text(rankText, margin + 5, yPosition);
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(voteText + partyText + winnerText, margin + 5, yPosition + 5);
        
        yPosition += 12;
      });
      
      yPosition += 5;
    });
    
    // Winners Summary - Centered
    if (pdfData.winners.length > 0) {
      checkPageBreak(60);
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      centerText('Election Winners', yPosition, 16);
      yPosition += 12;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      pdfData.winners.forEach((winner) => {
        checkPageBreak(10);
        const winnerText = `${winner.fullname} (${winner.position_name}) - ${winner.vote_count.toLocaleString()} votes`;
        const partyText = winner.party ? ` - ${winner.party}` : '';
        
        centerText(winnerText + partyText, yPosition, 11);
        yPosition += 6;
      });
    }
    
    // Footer - Centered
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      centerText(
        `Generated on ${pdfData.generation_date} - Page ${i} of ${totalPages}`,
        pageHeight - 10,
        8
      );
    }
    
    return pdf;
  };
  // Export as PDF with letterhead space - using centralized helper function
  const handlePdfExport = async (isAutomatic: boolean = false) => {
    if (!election_id) return;
    
    if (!isAutomatic) {
      setPdfLoading(true);
    }
    
    try {
      const response = await fetch(`${API_URL}/election_results/${election_id}/pdf`);
      if (!response.ok) {
        throw new Error('Failed to fetch PDF data');
      }
      
      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error('Invalid PDF data received');
      }
      
      const pdfData: PDFData = result.data;
      
      // Generate PDF using the centralized helper function
      const pdf = generateFormattedPDF(pdfData);
      
      // Download the PDF
      const fileName = `election-results-${pdfData.election_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      if (isAutomatic) {
        // For automatic generation, show a notification
        console.log('PDF automatically generated and ready for download');
        // You could add a toast notification here
      }
      
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (!isAutomatic) {
        alert('Error generating PDF report. Please try again.');
      }
    } finally {
      if (!isAutomatic) {
        setPdfLoading(false);
      }
    }
  };

  // Share (if possible)
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Decrypted Election Results",
        text: `See the decrypted results for election ${election_id}`,
        url: window.location.href,
      });
    } else {
      alert("Sharing is not supported on this device/browser.");
    }
  };

  // Get winners across all positions with null checks
  const winners = results.flatMap((position: PositionResult) => 
    (position.candidates || [])
      .filter((c: Candidate) => c && c.is_winner)
      .map((c: Candidate) => ({ ...c, position_name: position.position_name }))
  );
  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50/80 via-red-50/30 to-gray-100/80">
        <div className="max-w-4xl mx-auto pt-8 pb-8 space-y-6">
          {/* Header with return button */}
          <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <FaArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to Results</span>
          </button>
          <div className="text-sm text-gray-500">Election ID: {election_id}</div>
        </div>

        {/* Main content card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">          <div className="bg-gradient-to-r from-red-700 to-red-800 px-8 py-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FaChartBar className="w-6 h-6" />
              Decrypted Election Results
            </h1>
            <p className="text-red-100 mt-2">
              Final vote tallies successfully decrypted and ready for analysis
            </p>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <Loader4 size={80} />                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaChartBar className="w-8 h-8 text-red-700 animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-800">Loading Decrypted Results</h3>
                  <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                    Retrieving the final vote tallies from secure storage
                  </p>
                </div>                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-red-700">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="text-center space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <span className="font-semibold">Error</span>
                  </div>
                  <p>{error}</p>
                </div>
                <button
                  onClick={() => router.push("/admin/results")}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Return to Results
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Success indicator */}                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <FaCheckCircle className="w-8 h-8 text-green-700" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Decryption Complete</h3>
                    <p className="text-gray-600">All votes have been successfully decrypted and tallied</p>
                  </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-800">{results.length}</div>
                      <div className="text-gray-600 font-medium">Positions</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-800">{winners.length}</div>
                      <div className="text-gray-600 font-medium">Winners</div>
                    </div>
                  </div>
                </div>

                {/* Winners summary */}
                {winners.length > 0 && (
                  <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FaTrophy className="w-5 h-5 text-yellow-600" />
                      Election Winners
                    </h4>
                    <div className="space-y-2">
                      {winners.map((winner, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-yellow-200">
                          <div className="w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            <FaTrophy className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">{winner.fullname}</div>
                            <div className="text-sm text-gray-600">{winner.position_name} • {winner.vote_count} votes</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verification status */}
                {verificationStatus && (
                  <div className={`bg-${verificationStatus.verified ? 'green' : 'amber'}-50 rounded-xl p-6 border border-${verificationStatus.verified ? 'green' : 'amber'}-200`}>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FaCheckCircle className={`w-5 h-5 text-${verificationStatus.verified ? 'green' : 'amber'}-600`} />
                      Verification Status
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="font-medium text-gray-800">Decryption verification</div>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 bg-${verificationStatus.verified ? 'green' : 'amber'}-100 text-${verificationStatus.verified ? 'green' : 'amber'}-800 rounded-full text-xs font-semibold`}>
                          {verificationStatus.verified ? "Passed" : "Warning"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="font-medium text-gray-800">Vote count integrity</div>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 bg-${verificationStatus.vote_count_match ? 'green' : 'amber'}-100 text-${verificationStatus.vote_count_match ? 'green' : 'amber'}-800 rounded-full text-xs font-semibold`}>
                          {verificationStatus.vote_count_match ? "Validated" : "Minor discrepancy"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="font-medium text-gray-800">Total votes decrypted</div>
                        <div className="text-sm font-bold text-gray-800">{verificationStatus.total_decrypted}</div>
                      </div>
                      {verificationStatus.message && (
                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                          <div className="font-medium text-gray-800 mb-1">Message</div>
                          <div className="text-sm text-gray-600">{verificationStatus.message}</div>
                        </div>
                      )}
                    </div>
                  </div>                )}                {/* PDF Auto-Generation Status */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaFilePdf className="w-5 h-5 text-blue-600" />
                    PDF Report Status
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-blue-200">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 mb-1">Automatic PDF Generation</div>
                        <div className="text-sm text-gray-600 leading-relaxed">
                          PDF reports are automatically prepared during the decryption process. 
                          The system prepares structured data that can be exported as a formatted PDF document.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-blue-200">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mt-0.5">
                        <FaDownload className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 mb-1">Manual Export Available</div>
                        <div className="text-sm text-gray-600 leading-relaxed">
                          Click &quot;Export PDF&quot; below to generate and download a comprehensive PDF report with pre-formatted letterhead space.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results by position */}
                {results.length > 0 ? (
                  <div className="space-y-6">                    <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <FaChartBar className="w-5 h-5 text-red-700" />
                      Results by Position
                    </h4>
                      {results.map((position) => {
                      const candidates = position.candidates || [];
                      const positionTotalVotes = candidates.reduce((sum, c) => sum + (c?.vote_count || 0), 0);
                      
                      return (
                        <div key={position.position_id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                          <h5 className="text-lg font-semibold text-gray-800 mb-4">{position.position_name}</h5>
                          
                          <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="w-full">                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Candidate</th>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Party</th>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Votes</th>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Percentage</th>
                                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white">
                                {candidates
                                  .filter(candidate => candidate != null)
                                  .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
                                  .map((candidate, idx) => {
                                    const voteCount = candidate.vote_count || 0;
                                    const percentage = positionTotalVotes > 0 ? ((voteCount / positionTotalVotes) * 100).toFixed(1) : "0.0";
                                    return (
                                      <tr key={`${position.position_id}-${candidate.candidate_id}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="py-3 px-4 border-t border-gray-200">
                                          <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 ${candidate.is_winner ? 'bg-yellow-600' : 'bg-red-700'} text-white rounded-full flex items-center justify-center text-sm font-bold`}>
                                              {candidate.is_winner ? <FaTrophy className="w-4 h-4" /> : candidate.candidate_id}
                                            </div>
                                            <span className="font-medium text-gray-700">{candidate.fullname || 'Unknown Candidate'}</span>
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 border-t border-gray-200">
                                          <span className="text-gray-600">{candidate.party || '-'}</span>
                                        </td>
                                        <td className="py-3 px-4 border-t border-gray-200">
                                          <span className="text-xl font-bold text-gray-800">{voteCount}</span>
                                        </td>
                                        <td className="py-3 px-4 border-t border-gray-200">
                                          <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                              <div 
                                                className={`${candidate.is_winner ? 'bg-yellow-600' : 'bg-red-700'} h-2 rounded-full transition-all duration-500`}
                                                style={{ width: `${percentage}%` }}
                                              ></div>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-600 min-w-[3rem]">{percentage}%</span>
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 border-t border-gray-200">
                                          {candidate.is_winner ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                                              <FaTrophy className="w-3 h-3" />
                                              Winner
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                                              Candidate
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FaChartBar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No decrypted results available</p>
                  </div>
                )}                {/* Action buttons */}                <div className="flex gap-3 justify-center">
                  <button
                    className="flex items-center gap-2 bg-red-700 text-white px-6 py-3 rounded-xl hover:bg-red-800 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    onClick={handleExport}
                  >
                    <FaDownload className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button
                    className="flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-xl hover:bg-blue-800 font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-75 disabled:cursor-not-allowed"
                    onClick={() => handlePdfExport(false)}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <FaFilePdf className="w-4 h-4" />
                        Export PDF
                      </>
                    )}
                  </button>
                  <button
                    className="flex items-center gap-2 bg-gray-700 text-white px-6 py-3 rounded-xl hover:bg-gray-800 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    onClick={handleShare}
                  >
                    <FaShareAlt className="w-4 h-4" />
                    Share Results
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                  <FaArrowLeft className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Confirm Navigation</h3>
                <p className="text-gray-600 leading-relaxed">
                  Are you sure you want to return to the results page? You can always come back to view these decrypted results.
                </p>
              </div>
              <div className="flex gap-3 justify-center mt-6">
                <button
                  className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-all duration-200"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>                <button
                  className="px-6 py-3 rounded-xl bg-red-700 text-white hover:bg-red-800 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  onClick={() => router.push('/admin/results')}
                >                  Yes, Return
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>      {/* Scroll to top button */}
      <ArrowUpScrollToTop show={showScrollToTop} />
    </AdminLayout>
  );
}

export default function DecryptedResultsPage() {
  return (    <Suspense fallback={
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50/80 via-red-50/30 to-gray-100/80">
          <div className="max-w-6xl mx-auto pt-8 pb-8 space-y-6">
            <div className="flex items-center justify-between mb-6">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200">
              <FaArrowLeft className="w-4 h-4" />
              <span className="font-medium">Back to Results</span>
            </button>
            <div className="text-sm text-gray-500">Loading...</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">            <div className="bg-gradient-to-r from-red-700 to-red-800 px-8 py-6">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <FaChartBar className="w-6 h-6" />
                Decrypted Election Results
              </h1>
              <p className="text-red-100 mt-2">Final verified results from the election</p>
            </div>            <div className="p-8 text-center">
              <Loader4 size={80} />
              <p className="text-gray-600 mt-4">Loading decrypted results...</p>
            </div>
          </div>
          </div>
        </div>
      </AdminLayout>
    }>
      <DecryptedResultsContent />
    </Suspense>
  );
}
