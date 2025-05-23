"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Loader4 from "@/components/Loader4";
import AdminLayout from "@/layouts/AdminLayout";
import { FaDownload, FaShareAlt, FaArrowLeft } from "react-icons/fa";

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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
      })      .catch((e) => {
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

  return (
    <AdminLayout>
      <div className="max-w-xl mx-auto mt-10 bg-white rounded-xl shadow p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Decrypted Tally</h2>
        {loading ? (
          <div className="flex flex-col items-center">
            <Loader4 size={60} />
            <div className="mt-4 text-gray-700 text-center">Loading decrypted results...</div>
          </div>
        ) : error ? (
          <div className="w-full bg-red-100 text-red-800 px-4 py-2 rounded mb-4 text-center">{error}</div>
        ) : (
          <>            <div className="mb-4">
              <h3 className="text-lg font-semibold text-center mb-3">Decrypted Vote Counts</h3>
              <table className="w-full mb-6">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 rounded-tl-lg">Candidate ID</th>
                    <th className="text-left py-3 px-4 rounded-tr-lg">Vote Count</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={r.candidate_id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="py-3 px-4 border-t">{r.candidate_id}</td>
                      <td className="py-3 px-4 border-t font-semibold">{r.vote_count}</td>
                    </tr>
                  ))}
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-4 px-4 text-center text-gray-500">
                        No decrypted results available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 justify-center mb-4">
              <button
                className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
                onClick={handleExport}
              >
                <FaDownload /> Export
              </button>
              <button
                className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
                onClick={handleShare}
              >
                <FaShareAlt /> Share
              </button>
              <button
                className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                onClick={() => setShowConfirm(true)}
              >
                <FaArrowLeft /> Return
              </button>
            </div>
            {showConfirm && (              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full animate-fadeIn">
                  <h3 className="text-lg font-semibold mb-2">Confirm Navigation</h3>
                  <div className="mb-4 text-gray-600">
                    Are you sure you want to return to the results page? You can always come back to view these decrypted results.
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200"
                      onClick={() => setShowConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 rounded bg-blue-700 text-white hover:bg-blue-800 transition-colors duration-200"
                      onClick={() => router.push('/admin/results')}
                    >
                      Yes, Return
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
