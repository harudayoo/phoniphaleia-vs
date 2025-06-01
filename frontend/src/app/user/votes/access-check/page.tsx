'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Loader4 from '@/components/Loader4';
import SystemLogo2 from '@/components/SystemLogo2';
import { useUser } from '@/contexts/UserContext';
import NotVerifiedPage from '@/screens/NotVerifiedPage';
import WaitlistNotifPage from '@/screens/WaitlistNotifPage';
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
  'Verifying user credentials',
  'Checking voter eligibility',
  'Processing access request',
];

function AccessCheckContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [waitlistStatus, setWaitlistStatus] = useState<'waiting' | 'active' | null>(null);  const [showNotVerified, setShowNotVerified] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [electionData, setElectionData] = useState<Election | null>(null);

  // Debug wrapper for setShowNotVerified
  const debugSetShowNotVerified = (value: boolean) => {
    console.log(`🚨 setShowNotVerified(${value}) called`, new Error().stack);
    setShowNotVerified(value);
  };

  // Debug wrapper for setShowWaitlist  
  const debugSetShowWaitlist = (value: boolean) => {
    console.log(`✅ setShowWaitlist(${value}) called`, new Error().stack);
    setShowWaitlist(value);
  };

  const electionId = searchParams?.get('election_id');
  useEffect(() => {
    if (!electionId) {
      setError('No election specified.');
      return;
    }
    
    // Don't proceed if user is not loaded yet
    if (!user) {
      console.log('⏳ User not loaded yet, waiting...');
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
          debugSetShowNotVerified(true);
          return;
        }

        setStep(1);
        // Basic user validation - user should be available at this point
        if (!user.student_id) {
          debugSetShowNotVerified(true);
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

        setStep(2);
        // Check voter validity and eligibility first (without granting access)
        const eligibilityRes = await fetch(`${API_URL}/elections/${election.election_id}/access-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voter_id: user.student_id, grant_access: false })
        });
        
        const eligibilityData = await eligibilityRes.json();
        
        // If voter is not eligible, redirect to NotVerifiedPage
        if (!eligibilityData.eligible) {
          debugSetShowNotVerified(true);
          return;
        }

        setStep(3);
        // At this point, voter is valid and eligible - now handle access granting
        const accessRes = await fetch(`${API_URL}/elections/${election.election_id}/access-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voter_id: user.student_id, grant_access: true })
        });
          const accessData = await accessRes.json();
        
        if (accessData.access_granted) {
          // No need to increment voters count separately - the access-check endpoint already handles it
          // when grant_access: true is passed
          
          // Redirect to voting page
          router.push(`/user/votes/cast?election_id=${election.election_id}`);
          return;
        } else if (accessData.action === 'redirect_to_waitlist') {
          // Election is full - redirect to waitlist
          setElectionData(election);
          debugSetShowNotVerified(false);
          debugSetShowWaitlist(true);
          setWaitlistStatus('waiting');
          return;
        } else {
          // Unexpected response
          setError('Failed to grant voting access.');
          return;
        }
      } catch (error) {
        console.error('Error in access check:', error);
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
        try {
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
                  // Clear the polling interval first
                  if (pollInterval) clearInterval(pollInterval);
                  
                  toast((t) => (
                    <span>
                      It&apos;s your turn to vote!{' '}
                      <button
                        className="underline text-blue-700 ml-2"
                        onClick={async () => {
                          toast.dismiss(t.id);
                          try {
                            // Activate from waitlist through the next_in_waitlist endpoint
                            const activateRes = await fetch(`${API_URL}/elections/${electionId}/waitlist/next`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' }
                            });
                            
                            if (activateRes.ok) {
                              // Now try to grant access - the voter should be in 'active' status
                              const grantAccessRes = await fetch(`${API_URL}/elections/${electionId}/access-check`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ voter_id: user.student_id, grant_access: true })
                              });
                              const grantAccessData = await grantAccessRes.json();
                              if (grantAccessData.access_granted) {
                                router.replace(`/user/votes/cast?election_id=${electionId}`);
                              } else {
                                toast.error('Failed to grant voting access.');
                              }
                            } else {
                              toast.error('Failed to activate from waitlist.');
                            }
                          } catch (error) {
                            console.error('Error processing waitlist access:', error);
                            toast.error('An error occurred. Please try again.');
                          }
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
        } catch (error) {
          console.error('Error checking waitlist position:', error);
        }
      }, 5000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [waitlistStatus, electionId, user, router]);
  if (showNotVerified) {
    console.log('🔴 RENDER: showNotVerified=true, returning NotVerifiedPage');
    return <NotVerifiedPage />;
  }

  if (showWaitlist && electionData && user) {
    console.log('🟢 RENDER: showWaitlist=true, electionData exists, user exists, returning WaitlistNotifPage');
    return (
      <WaitlistNotifPage 
        electionId={electionData.election_id}
        voterId={user.student_id}
        electionName={electionData.election_name}
      />
    );
  }

  console.log('🟡 RENDER: Default render - showNotVerified=', showNotVerified, 'showWaitlist=', showWaitlist, 'electionData=', !!electionData, 'user=', !!user);

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

export default function AccessCheckPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen w-full" style={{ minHeight: '100vh', width: '100vw', background: 'linear-gradient(135deg, #f9fafb 100%, #f9fafb 100%, #fef9c3 50%, #fef9c3 100%)' }}>
        <SystemLogo2 width={200} className="mb-8" />
        <div className="flex flex-col items-center justify-center">
          <Loader4 size={150} className="mb-6" />
          <div className="mt-2 text-lg font-semibold text-gray-700 min-h-[2.5rem] text-center">
            <span className="block animate-pulse">Loading...</span>
            <div className="mt-2 text-sm text-gray-500">Please wait while we prepare your voting access.</div>
          </div>
        </div>
      </div>
    }>
      <AccessCheckContent />
    </Suspense>
  );
}
