"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Loader4 from "@/components/Loader4";
import AdminLayout from "@/layouts/AdminLayout";
import ArrowUpScrollToTop from "@/components/ArrowUpScrollToTop";
import { FaDownload, FaShareAlt, FaArrowLeft, FaChartBar, FaCheckCircle } from "react-icons/fa";

interface DecryptedResult {
  candidate_id: number;
  vote_count: number;
}

export default function DecryptedResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const election_id = searchParams?.get("election_id");
  const [results, setResults] = useState<DecryptedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Handle scroll detection for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollToTop(window.scrollY > 80);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!election_id) return;
    setLoading(true);
    fetch(`${API_URL}/election_results/${election_id}/decrypted`).then(async (res) => {
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
        setResults(data.results || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [election_id, API_URL]);

  // Export as CSV
  const handleExport = () => {
    const csv = [
      "Candidate ID,Vote Count",
      ...results.map(r => `${r.candidate_id},${r.vote_count}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decrypted_results_${election_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Calculate total votes
  const totalVotes = results.reduce((sum, r) => sum + r.vote_count, 0);

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto mt-8 space-y-6">
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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FaChartBar className="w-6 h-6" />
              Decrypted Election Results
            </h1>
            <p className="text-green-100 mt-2">
              Final vote tallies successfully decrypted and ready for analysis
            </p>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <Loader4 size={80} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaChartBar className="w-8 h-8 text-green-600 animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-800">Loading Decrypted Results</h3>
                  <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                    Retrieving the final vote tallies from secure storage
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
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
                {/* Success indicator */}
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <FaCheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Decryption Complete</h3>
                  <p className="text-gray-600">All votes have been successfully decrypted and tallied</p>
                </div>

                {/* Summary card */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-800">{totalVotes}</div>
                    <div className="text-gray-600 font-medium">Total Votes Cast</div>
                  </div>
                </div>

                {/* Results table */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaChartBar className="w-5 h-5 text-green-600" />
                    Vote Distribution
                  </h4>
                  
                  {results.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Candidate ID</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Vote Count</th>
                            <th className="text-left py-4 px-6 font-semibold text-gray-700">Percentage</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {results.map((r, idx) => {
                            const percentage = totalVotes > 0 ? ((r.vote_count / totalVotes) * 100).toFixed(1) : "0.0";
                            return (
                              <tr key={r.candidate_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="py-4 px-6 border-t border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                      {r.candidate_id}
                                    </div>
                                    <span className="font-medium text-gray-700">Candidate {r.candidate_id}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6 border-t border-gray-200">
                                  <span className="text-xl font-bold text-gray-800">{r.vote_count}</span>
                                </td>
                                <td className="py-4 px-6 border-t border-gray-200">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-600 min-w-[3rem]">{percentage}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FaChartBar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No decrypted results available</p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 justify-center">
                  <button
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                    onClick={handleExport}
                  >
                    <FaDownload className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
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
                </button>
                <button
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  onClick={() => router.push('/admin/results')}
                >
                  Yes, Return
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to top button */}
      <ArrowUpScrollToTop show={showScrollToTop} />
    </AdminLayout>
  );
}
