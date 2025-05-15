'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Loader4 from '@/components/Loader4'; // Make sure you have a Loader component
import SystemLogo2 from '@/components/SystemLogo2';
import { useUser } from '@/contexts/UserContext';
import type { Organization } from '@/types/admin';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Types for Election
interface Election {
  election_id: number;
  election_name: string;
  election_desc?: string;
  org_id?: number;
  college_id?: number;
}

const steps = [
  "Checking Election Parameters",
  "Verifying user eligibility",
  "Authenticating voting eligibility"
];

export default function AccessCheckPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const electionId = searchParams.get('election_id');

  useEffect(() => {
    if (!electionId) {
      setError('No election specified.');
      return;
    }

    const timeout1 = setTimeout(() => setStep(1), 1500);
    const timeout2 = setTimeout(() => setStep(2), 3000);
    const timeout3 = setTimeout(async () => {
      try {
        // Fetch election details
        const res = await fetch(`${API_URL}/elections`);
        const elections: Election[] = await res.json();
        const election = elections.find((e: Election) => String(e.election_id) === String(electionId));
        if (!election) {
          setError('Election not found.');
          return;
        }

        // If election has org_id, check for college_id
        if (election.org_id) {
          // Fetch organization details
          const orgRes = await fetch(`${API_URL}/organizations`);
          const orgs: Organization[] = await orgRes.json();
          const org = orgs.find((o: Organization) => o.id === election.org_id);

          if (org && org.college_id) {
            // Check user college_id
            if (!user || user.college_id !== org.college_id) {
              setError('You are not eligible to vote in this election (college restriction).');
              return;
            }
          }
          // If org exists but no college_id, allow access
        }
        // Grant access
        router.replace(`/user/votes/cast?election_id=${electionId}`);
      } catch {
        setError('Error verifying eligibility.');
      }
    }, 5000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [electionId, user, router]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-full"
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #f9fafb 100%, #f9fafb 100%, #fef9c3 50%, #fef9c3 100%)', // gray-50 to yellow-100, split at 50%
      }}
    >
      <SystemLogo2 width={200} className="mb-8" />
      <div className="flex flex-col items-center justify-center">
        <Loader4 size={150} className="mb-6" />
        <div className="mt-2 text-lg font-semibold text-gray-700 min-h-[2.5rem] text-center">
          {error ? (
            <span className="text-red-600">{error}</span>
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