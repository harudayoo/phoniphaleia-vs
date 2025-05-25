// Vote Review Page - displays submitted votes and allows sending a vote receipt
'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Loader4 from '@/components/Loader4';
import SystemLogo2 from '@/components/SystemLogo2';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ReviewVote {
  candidate_id: number;
  position_id: number;
  candidate_name: string;
  party: string;
  position_name: string;
}

function VoteReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [votes, setVotes] = useState<ReviewVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Get election_id and student_id from params or context
  const electionId = searchParams ? searchParams.get('election_id') : null;
  const studentId = searchParams ? searchParams.get('student_id') : null;

  useEffect(() => {
    async function fetchVotes() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/elections/${electionId}/votes/by-voter/${studentId}`);
        if (!res.ok) throw new Error('Failed to fetch votes');
        const data = await res.json();
        setVotes(data.votes || []);
      } catch {
        setError('Failed to load your submitted votes.');
      }
      setLoading(false);
    }
    if (electionId && studentId) fetchVotes();
  }, [electionId, studentId]);

  const handleSendReceipt = async () => {
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_URL}/elections/${electionId}/votes/send-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId })
      });
      if (!res.ok) throw new Error('Failed to send vote receipt');
      setSuccess('Vote receipt sent to your email!');
      setEmailSent(true);
      setTimeout(() => {
        router.push('/user/votes');
      }, 2500);
    } catch {
      setError('Failed to send vote receipt. Please try again.');
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 relative overflow-hidden">
      <Image src="/usep-bg.jpg" alt="bg" fill style={{ objectFit: 'cover', opacity: 0.08, zIndex: 0 }} />
      <div className="z-10 flex flex-col items-center w-full">
        <SystemLogo2 width={180} className="mb-8 drop-shadow-lg" />
        <div className="max-w-xl w-full bg-white/90 backdrop-blur-md rounded-2xl p-10 shadow-2xl border border-yellow-200 mx-auto flex flex-col items-center"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          <h2 className="text-3xl font-extrabold text-center mb-8 text-green-700 tracking-tight drop-shadow-sm">Your Submitted Votes</h2>
          {loading ? (
            <div className="flex flex-col items-center">
              <Loader4 size={90} className="mb-6" />
              <p className="text-gray-600 font-semibold text-center text-lg">Loading your votes...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 mb-4 text-lg font-semibold">{error}</div>
          ) : (
            <>
              <div className="w-full overflow-x-auto mb-6">
                <table className="w-full border border-yellow-200 rounded-xl overflow-hidden shadow-sm bg-white">
                  <thead>
                    <tr className="bg-yellow-100">
                      <th className="p-3 text-left text-xs font-bold text-yellow-800 uppercase tracking-wider">Position</th>
                      <th className="p-3 text-left text-xs font-bold text-yellow-800 uppercase tracking-wider">Candidate</th>
                      <th className="p-3 text-left text-xs font-bold text-yellow-800 uppercase tracking-wider">Party</th>
                    </tr>
                  </thead>
                  <tbody>
                    {votes.map((v, i) => (
                      <tr key={i} className="border-b last:border-b-0 hover:bg-yellow-50 transition">
                        <td className="p-3 text-sm text-gray-900 font-medium">{v.position_name}</td>
                        <td className="p-3 text-sm text-gray-800">{v.candidate_name}</td>
                        <td className="p-3 text-sm text-gray-700">{v.party}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-bold text-lg shadow-md transition mb-2 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleSendReceipt}
                disabled={sending || emailSent}
              >
                {sending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader4 size={24} /> Sending Receipt...
                  </span>
                ) : emailSent ? 'Receipt Sent!' : 'Send Vote Receipt to Email'}
              </button>
              {success && <div className="text-green-700 text-center mt-3 font-semibold animate-fade-in">{success}</div>}
              {emailSent && <div className="text-gray-500 text-center text-xs mt-2">You will be redirected to the elections page shortly.</div>}
            </>
          )}        </div>
      </div>
    </div>
  );
}

export default function VoteReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 relative overflow-hidden">
        <Image src="/usep-bg.jpg" alt="bg" fill style={{ objectFit: 'cover', opacity: 0.08, zIndex: 0 }} />
        <div className="z-10 flex flex-col items-center w-full">
          <SystemLogo2 width={180} className="mb-8 drop-shadow-lg" />
          <div className="max-w-xl w-full bg-white/90 backdrop-blur-md rounded-2xl p-10 shadow-2xl border border-yellow-200 mx-auto flex flex-col items-center">
            <h2 className="text-3xl font-extrabold text-center mb-8 text-green-700 tracking-tight drop-shadow-sm">Your Submitted Votes</h2>
            <div className="flex flex-col items-center">
              <Loader4 size={90} className="mb-6" />
              <p className="text-gray-600 font-semibold text-center text-lg">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <VoteReviewContent />
    </Suspense>
  );
}
