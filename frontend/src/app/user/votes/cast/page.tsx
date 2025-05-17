// Voting cast page for a specific election
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Candidate {
  candidate_id: number;
  fullname: string;
  position_id: number;
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
  const electionId = searchParams.get('election_id');

  const [positions, setPositions] = useState<Position[]>([]);
  const [selected, setSelected] = useState<{ [positionId: number]: number | null }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCandidate, setShowCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all positions for the org of the election
        const electionRes = await fetch(`${API_URL}/elections`);
        const elections: { election_id: number; org_id: number }[] = await electionRes.json();
        const election = elections.find((e) => String(e.election_id) === String(electionId));
        if (!election) {
          setError('Election not found.');
          setLoading(false);
          return;
        }
        const orgId = election.org_id;
        // Fetch positions for this org
        const posRes = await fetch(`${API_URL}/positions`);
        const allPositions: { id: number; name: string; description?: string; organization_id: number }[] = await posRes.json();
        const orgPositions = allPositions.filter((p) => p.organization_id === orgId);
        // Fetch candidates for this election
        const candRes = await fetch(`${API_URL}/elections/${electionId}/candidates`);
        const candidates: Candidate[] = await candRes.json();
        // Group candidates by position
        const positionsWithCandidates: Position[] = orgPositions.map((pos: { id: number; name: string; description?: string }) => ({
          position_id: pos.id,
          position_name: pos.name,
          description: pos.description,
          candidates: candidates.filter((c: Candidate) => c.position_id === pos.id),
        }));
        setPositions(positionsWithCandidates);
        // Initialize selection state
        const initialSelected: { [positionId: number]: number | null } = {};
        positionsWithCandidates.forEach(pos => {
          initialSelected[pos.position_id] = null;
        });
        setSelected(initialSelected);
      } catch {
        setError('Failed to load election data.');
      }
      setLoading(false);
    };
    if (electionId) fetchData();
  }, [electionId]);

  const handleSelect = (positionId: number, candidateId: number) => {
    setSelected(prev => ({ ...prev, [positionId]: candidateId }));
  };

  const handleSubmit = () => {
    // No DB submission yet, just validate
    for (const pos of positions) {
      if (!selected[pos.position_id]) {
        setError(`Please select a candidate for ${pos.position_name}.`);
        setSuccess(null);
        return;
      }
    }
    setError(null);
    setSuccess('Your selections are valid! (Not submitted yet)');
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
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 w-full text-center">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4 w-full text-center">{success}</div>}
        {loading ? (
          <div className="text-center py-12 text-lg text-gray-600">Loading candidates...</div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="w-full">
            {positions.map(pos => (
              <div key={pos.position_id} className="mb-8">
                <h3 className="font-semibold text-lg mb-2 text-gray-800">{pos.position_name}</h3>
                {pos.description && <div className="text-gray-500 mb-2 text-sm">{pos.description}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pos.candidates.map(cand => (
                    <label key={cand.candidate_id} className={`flex items-center p-3 rounded border cursor-pointer transition bg-white hover:bg-yellow-50 shadow-sm ${selected[pos.position_id] === cand.candidate_id ? 'border-yellow-500 ring-2 ring-yellow-300' : 'border-gray-200'}`}
                      style={{ minHeight: 60 }}>
                      <input
                        type="radio"
                        name={`position-${pos.position_id}`}
                        value={cand.candidate_id}
                        checked={selected[pos.position_id] === cand.candidate_id}
                        onChange={() => handleSelect(pos.position_id, cand.candidate_id)}
                        className="mr-3 accent-yellow-500"
                      />
                      <span
                        className="font-medium text-blue-900 underline hover:text-blue-700 cursor-pointer"
                        onClick={e => { e.preventDefault(); setShowCandidate(cand); }}
                        tabIndex={0}
                        role="button"
                        aria-label={`View details for ${cand.fullname}`}
                      >
                        {cand.fullname}
                      </span>
                      {cand.party && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{cand.party}</span>}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-center mt-8">
              <button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-8 py-3 rounded shadow transition w-full md:w-auto"
              >
                Review Vote
              </button>
            </div>
          </form>
        )}
        {/* Candidate details modal */}
        {showCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative animate-fade-in">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                onClick={() => setShowCandidate(null)}
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-xl font-bold mb-2 text-gray-800">{showCandidate.fullname}</h2>
              {showCandidate.party && <div className="mb-2 text-sm text-blue-700">Party: {showCandidate.party}</div>}
              {showCandidate.candidate_desc && <div className="mb-2 text-gray-700">{showCandidate.candidate_desc}</div>}
              <div className="mt-4 flex justify-end">
                <button
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  onClick={() => setShowCandidate(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
