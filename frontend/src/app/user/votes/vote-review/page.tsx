// Vote Review Page - displays submitted votes and allows sending a vote receipt
'use client';
import { useEffect, useState } from 'react';
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

export default function VoteReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [votes, setVotes] = useState<ReviewVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Get election_id and student_id from params or context
  const electionId = searchParams.get('election_id');
  const studentId = searchParams.get('student_id');

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
    <div className="min-h-screen flex flex-col items-center justify-center"
      style={{ 
        minHeight: '100vh', 
        width: '100vw', 
        background: 'linear-gradient(135deg, #f9fafb 100%, #f9fafb 100%, #fef9c3 50%, #fef9c3 100%)' 
      }}
    >
      <Image src="/usep-bg.jpg" alt="bg" fill style={{ objectFit: 'cover', opacity: 0.08, zIndex: 0 }} />
      <div className="z-10">
        <SystemLogo2 width={200} className="mb-8" />
        <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6">Your Submitted Votes</h2>
          {loading ? (
            <div className="flex flex-col items-center">
              <Loader4 size={100} className="mb-6" />
              <p className="text-gray-700 font-medium text-center">Loading your votes...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 mb-4">{error}</div>
          ) : (
            <>
              <table className="w-full mb-6 border border-gray-200 rounded overflow-hidden">
                <thead>
                  <tr className="bg-yellow-100">
                    <th className="p-2 text-left text-xs font-semibold text-gray-700">Position</th>
                    <th className="p-2 text-left text-xs font-semibold text-gray-700">Candidate</th>
                    <th className="p-2 text-left text-xs font-semibold text-gray-700">Party</th>
                  </tr>
                </thead>
                <tbody>
                  {votes.map((v, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="p-2 text-sm text-gray-800">{v.position_name}</td>
                      <td className="p-2 text-sm text-gray-800">{v.candidate_name}</td>
                      <td className="p-2 text-sm text-gray-800">{v.party}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                className="w-full py-2 px-4 bg-green-700 hover:bg-green-800 text-white rounded-lg font-semibold transition mb-2 disabled:opacity-60"
                onClick={handleSendReceipt}
                disabled={sending || emailSent}
              >
                {sending ? 'Sending Receipt...' : emailSent ? 'Receipt Sent!' : 'Send Vote Receipt to Email'}
              </button>
              {success && <div className="text-green-700 text-center mt-2">{success}</div>}
              {emailSent && <div className="text-gray-500 text-center text-xs mt-2">You will be redirected to the elections page shortly.</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
