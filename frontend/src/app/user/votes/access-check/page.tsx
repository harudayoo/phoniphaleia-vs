'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Loader4 from '@/components/Loader4';
import SystemLogo2 from '@/components/SystemLogo2';
import { useUser } from '@/contexts/UserContext';
import NotVerifiedPage from '@/screens/NotVerifiedPage';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Election {
  election_id: number;
  election_name: string;
  election_desc?: string;
  org_id?: number;
  queued_access?: boolean;
  max_concurrent_voters?: number;
  voters_count?: number;
}

const steps = [
  'Checking Election Parameters',
  'Verifying user eligibility',
  'Authenticating voting eligibility',
];

export default function AccessCheckPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [waitlistStatus] = useState<'waiting' | 'active' | null>(null);
  const [showNotVerified, setShowNotVerified] = useState(false);

  const electionId = searchParams?.get('election_id');

  useEffect(() => {
    if (!electionId) {
      setError('No election specified.');
      return;
    }
    const doAccessCheck = async () => {
      try {
        setStep(0);
        // Fetch election details
        const res = await fetch(`${API_URL}/elections`);
        const elections: Election[] = await res.json();
        const election = elections.find((e: Election) => String(e.election_id) === String(electionId));
        if (!election) {
          setShowNotVerified(true);
          return;
        }
        setStep(1);
        // Use backend access-check endpoint for eligibility
        if (!user || !user.student_id) {
          setShowNotVerified(true);
          return;
        }
        // Check if user already voted
        const voteCheckRes = await fetch(`${API_URL}/elections/${election.election_id}/vote-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voter_id: user.student_id })
        });
        const voteCheckData = await voteCheckRes.json();
        if (voteCheckData && voteCheckData.unique === false) {
          setError('You have already voted in this election.');
          return;
        }
        const accessRes = await fetch(`${API_URL}/elections/${election.election_id}/access-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voter_id: user.student_id })
        });
        const accessData = await accessRes.json();
        if (!accessData.eligible) {
          setShowNotVerified(true);
          return;
        }
        setStep(2);
        // Waitlist logic
        if (!election.queued_access) {
          // No queue, go to cast and (optionally) increment voter count
          await fetch(`${API_URL}/elections/${election.election_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voters_count: (election.voters_count || 0) + 1 })
          });
          router.replace(`/user/votes/cast?election_id=${electionId}`);
          return;
        } else if (user) {
          // Queued access: check current voters_count vs max_concurrent_voters
          if ((election.voters_count || 0) < (election.max_concurrent_voters || 1)) {
            // Grant access, increment voter_count
            await fetch(`${API_URL}/elections/${election.election_id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ voters_count: (election.voters_count || 0) + 1 })
            });
            router.replace(`/user/votes/cast?election_id=${electionId}`);
            return;
          } else {
            // Add to waitlist
            await fetch(`${API_URL}/elections/${election.election_id}/waitlist/join`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ voter_id: user.student_id })
            });
            toast.success('You have been added to the waitlist. You will be notified when it is your turn to vote.');
            router.replace('/user/votes');
            return;
          }
        }
      } catch {
        setError('Error verifying eligibility.');
      }
    };
    doAccessCheck();
  }, [electionId, user, router]);

  // Poll for waitlist activation
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    if (waitlistStatus === 'waiting' && electionId && user) {
      pollInterval = setInterval(async () => {
        const posRes = await fetch(`${API_URL}/elections/${electionId}/waitlist/position?voter_id=${user.student_id}`);
        if (posRes.ok) {
          const posData = await posRes.json();
          if (posData.position === 1) {
            // Check if a slot is available
            const activeRes = await fetch(`${API_URL}/elections/${electionId}/active_voters`);
            if (activeRes.ok) {
              const activeData = await activeRes.json();
              const electionRes = await fetch(`${API_URL}/elections`);
              const elections: Election[] = await electionRes.json();
              const election = elections.find((e: Election) => String(e.election_id) === String(electionId));
              if (activeData.active_voters < (election?.max_concurrent_voters || 1)) {
                toast((t) => (
                  <span>
                    It&apos;s your turn to vote!{' '}
                    <button
                      className="underline text-blue-700 ml-2"
                      onClick={() => {
                        toast.dismiss(t.id);
                        // Remove from waitlist
                        fetch(`${API_URL}/elections/${electionId}/waitlist/leave`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ voter_id: user.student_id })
                        });
                        router.replace(`/user/votes/cast?election_id=${electionId}`);
                      }}
                    >
                      Click here to proceed
                    </button>
                  </span>
                ), { duration: 10000, icon: '✅' });
              }
            }
          }
        }
      }, 5000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [waitlistStatus, electionId, user, router]);

  if (showNotVerified) return <NotVerifiedPage />;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full" style={{ minHeight: '100vh', width: '100vw', background: 'linear-gradient(135deg, #f9fafb 100%, #f9fafb 100%, #fef9c3 50%, #fef9c3 100%)' }}>
      <SystemLogo2 width={200} className="mb-8" />
      <div className="flex flex-col items-center justify-center">
        <Loader4 size={150} className="mb-6" />
        <div className="mt-2 text-lg font-semibold text-gray-700 min-h-[2.5rem] text-center">
          {error ? (
            <span className="text-red-600">{error}</span>
          ) : waitlistStatus === 'waiting' ? (
            <span className="text-yellow-600">You are in the waitlist. Please wait for your turn...</span>
          ) : (
            <>
              <span className="block animate-pulse">{steps[step]}</span>
              <div className="mt-2 text-sm text-gray-500">Please wait while we check your access to this election.</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}