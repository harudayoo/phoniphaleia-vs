// Voting cast page for a specific election
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Candidate {
  candidate_id: number;
  fullname: string;
  party?: string;
  candidate_desc?: string;
}

interface Position {
  position_id: number;
  position_name: string;
  description?: string;
  candidates: Candidate[];
}

export default function CastVotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const electionId = Number(searchParams.get('election_id'));
  const [positions, setPositions] = useState<Position[]>([]);
  const [selected, setSelected] = useState<{ [positionId: number]: number | null }>({});
  const [showDetails, setShowDetails] = useState<{ [candidateId: number]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!electionId) return;
    setLoading(true);
    fetch(`${API_URL}/elections/${electionId}/candidates`)
      .then(res => res.json())
      .then((data: Position[]) => {
        setPositions(data);
        // Initialize selection state
        const initial: { [positionId: number]: number | null } = {};
        data.forEach(pos => { initial[pos.position_id] = null; });
        setSelected(initial);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load candidates.');
        setLoading(false);
      });
  }, [electionId]);

  const handleSelect = (positionId: number, candidateId: number) => {
    setSelected(prev => ({ ...prev, [positionId]: candidateId }));
  };

  const handleShowDetails = (candidateId: number) => {
    setShowDetails(prev => ({ ...prev, [candidateId]: !prev[candidateId] }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    let user: { student_id?: string } = {};
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        user = JSON.parse(userStr);
      }
    } catch {
      setError('User not found or invalid.');
      setSubmitting(false);
      return;
    }
    if (!user.student_id) {
      setError('User not found or invalid.');
      setSubmitting(false);
      return;
    }
    const votes = Object.entries(selected)
      .filter(([, candidateId]) => candidateId !== null)
      .map(([positionId, candidateId]) => ({
        position_id: Number(positionId),
        candidate_id: candidateId as number,
        encrypted_vote: '', // Placeholder for encryption
        zkp_proof: '', // Placeholder for ZKP
        verification_receipt: '' // Placeholder for receipt
      }));
    if (votes.length !== positions.length) {
      setError('Please select one candidate for each position.');
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/elections/${electionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: user.student_id, votes })
      });
      const data: { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit vote');
      setSuccess('Your vote has been submitted successfully!');
      setTimeout(() => router.push('/user/votes'), 2000);
    } catch (e) {
      let message = 'Failed to submit vote.';
      if (e instanceof Error) message = e.message;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start py-8 px-2" style={{
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Place the background image behind everything */}
      <Image src="/usep-bg.jpg" alt="bg" fill style={{ objectFit: 'cover', opacity: 0.1, zIndex: 0 }} />
      {/* Gradient overlay above the image, below content */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(135deg,
            #ffe6e6 0%,
            #ffe6e6 7%,
            transparent 50%,
            #fffbe6 93%,
            #fffbe6 100%)`,
        }}
      />
      {/* Return to Elections button at the top-left */}
      <div className="absolute top-6 left-6 z-30">
        <button
          type="button"
          className="px-4 py-2 hover:text-red-950 text-red-700 text-shadow-md font-medium transition"
          onClick={() => router.push('/user/votes')}
        >
          ← Return to Elections
        </button>
      </div>
      <div className="relative z-20 w-full max-w-2xl mx-auto flex flex-col items-center">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded mb-6 shadow"
          style={{ width: '85%' }}>
          <b>Voting Rules:</b> You may select <b>one candidate per position</b>. You can only vote <b>once per election</b>. Please review your selections before submitting.
        </div>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}
        {loading ? (
          <div className="text-center py-12 text-lg text-gray-600">Loading candidates...</div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
            {positions.map(pos => (
              <div key={pos.position_id} className="mb-8">
                <h3 className="font-semibold text-lg mb-2 text-gray-800">{pos.position_name}</h3>
                {pos.description && <div className="text-gray-500 mb-2 text-sm">{pos.description}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pos.candidates.map(cand => (
                    <div
                      key={cand.candidate_id}
                      className={`border-2 rounded-lg p-4 bg-white shadow cursor-pointer transition-all duration-150 ${selected[pos.position_id] === cand.candidate_id ? 'border-yellow-500 ring-2 ring-yellow-300' : 'border-gray-200 hover:border-yellow-400'}`}
                      onClick={() => handleSelect(pos.position_id, cand.candidate_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{cand.fullname}</div>
                          <div className="text-sm text-gray-600">{cand.party || 'Independent'}</div>
                        </div>
                        <div>
                          <input
                            type="checkbox"
                            checked={selected[pos.position_id] === cand.candidate_id}
                            onChange={() => handleSelect(pos.position_id, cand.candidate_id)}
                            className="w-5 h-5 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400"
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                      </div>
                      {showDetails[cand.candidate_id] || selected[pos.position_id] === cand.candidate_id ? (
                        <div className="mt-3 text-gray-700">
                          <div className="mb-1"><b>Description:</b> {cand.candidate_desc || 'No description provided.'}</div>
                          <button
                            type="button"
                            className="text-blue-600 hover:underline text-sm mt-1"
                            onClick={e => { e.stopPropagation(); handleShowDetails(cand.candidate_id); }}
                          >Hide details</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-blue-600 hover:underline text-sm mt-3"
                          onClick={e => { e.stopPropagation(); handleShowDetails(cand.candidate_id); }}
                        >View details</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end mt-8">
              <button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-3 rounded shadow disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Vote'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
