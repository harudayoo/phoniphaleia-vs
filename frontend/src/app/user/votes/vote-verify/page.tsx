'use client';
import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Loader4 from '@/components/Loader4';
import SystemLogo2 from '@/components/SystemLogo2';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { 
  VoteVerificationErrorType, 
  handleVerificationError, 
  getErrorMessage 
} from '@/services/voteVerificationErrors';
import { formatElGamalPublicKey } from '@/services/cryptoConfigService';
import { encryptPaillierVote } from '@/services/paillierService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Vote {
  position_id: number;
  candidate_id: number;
}

interface VerificationStatus {
  uniqueVote: 'pending' | 'verified' | 'failed';
  validVote: 'pending' | 'verified' | 'failed';  
  followsRules: 'pending' | 'verified' | 'failed';
}

function VoteVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();  // State for tracking the current election and votes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [electionId, setElectionId] = useState<string | null>(null);
  const [electionName, setElectionName] = useState<string>('');
  // Store votes in state for potential UI usage (e.g., showing what was voted for)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setPublicKey] = useState<string | null>(null);  
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    uniqueVote: 'pending',
    validVote: 'pending',
    followsRules: 'pending',
  });  const [overallStatus, setOverallStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [submissionInProgress, setSubmissionInProgress] = useState(false);
  const initializationStarted = useRef(false);
    // Define verifyVotes using useCallback to avoid re-creation on every render
  const verifyVotes = useCallback(async (eId: string, votesToVerify: Vote[], key: string) => {
    // Prevent duplicate submissions
    if (submissionInProgress) {
      console.log('Submission already in progress, skipping...');
      return;
    }
    
    setSubmissionInProgress(true);
    
    try {
      // Step 1: Verify voter hasn't voted before
      await new Promise(resolve => setTimeout(resolve, 1500));
      const uniqueRes = await fetch(`${API_URL}/elections/${eId}/vote-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          voter_id: user?.student_id 
        })
      });
        const uniqueData = await uniqueRes.json();
      setVerificationStatus(prev => ({ ...prev, uniqueVote: uniqueData.unique ? 'verified' : 'failed' }));
        if (!uniqueData.unique) {
        // User has already voted - redirect to votes page instead of showing error
        console.log('User has already voted, redirecting to votes page');
        setSubmissionInProgress(false);
        router.push('/user/votes');
        return;
      }
        // Step 2: Verify vote validity with ZKP
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      try {
        // Import the vote verification service for ZKP
        const { generateVoteProof, validateVoteRules, verifyVoteProof } = await import('@/services/voteVerificationService');
        
        // First check if votes follow election rules (one per position)
        const followsRules = validateVoteRules(votesToVerify);
        setVerificationStatus(prev => ({ ...prev, followsRules: followsRules ? 'verified' : 'failed' }));
          if (!followsRules) {
          const error = handleVerificationError(
            new Error('Votes do not follow election rules'),
            VoteVerificationErrorType.MULTIPLE_VOTES_FOR_POSITION
          );
          setError(getErrorMessage(error));
          setLoading(false);
          setOverallStatus('failed');
          setSubmissionInProgress(false);
          return;
        }
        
        // Create ZKP proof input
        const zkpInput = {
          voterId: user?.student_id || '',
          electionId: parseInt(eId || '0'),
          candidateIds: votesToVerify.map(v => v.candidate_id),
          positionIds: votesToVerify.map(v => v.position_id),
          nonce: Math.random().toString(36).substring(2, 15) // Random nonce for security
        };
        
        // Generate ZK Proof
        console.log('Generating ZK proof with inputs:', zkpInput);
        
        // Call the proof generation function
        const verificationResult = await generateVoteProof(zkpInput);
          if (!verificationResult.isValid) {
          const error = handleVerificationError(
            new Error(verificationResult.error || 'ZKP generation failed'),
            VoteVerificationErrorType.ZKP_GENERATION_FAILED
          );
          setError(getErrorMessage(error));
          setVerificationStatus(prev => ({ ...prev, validVote: 'failed' }));
          setLoading(false);
          setOverallStatus('failed');
          setSubmissionInProgress(false);
          return;
        }
          // Verify the generated proof
        let isVerified = false;
        if (verificationResult.proof && verificationResult.publicSignals) {
          try {
            console.log('About to verify proof with data:');
            console.log('Proof:', JSON.stringify(verificationResult.proof));
            console.log('Public Signals:', JSON.stringify(verificationResult.publicSignals));
            
            isVerified = await verifyVoteProof(
              verificationResult.proof,
              verificationResult.publicSignals
            );
            console.log('Verification result:', isVerified);
          } catch (verifyError) {
            console.error('Error during verification:', verifyError);
            const errorMessage = verifyError instanceof Error ? verifyError.message : String(verifyError);
            console.error('Verification error details:', errorMessage);
            // Continue with isVerified = false
          }
          
          setVerificationStatus(prev => ({ ...prev, validVote: isVerified ? 'verified' : 'failed' }));
            if (!isVerified) {
            const error = handleVerificationError(
              new Error('ZKP verification failed'),
              VoteVerificationErrorType.ZKP_VERIFICATION_FAILED
            );
            setError(getErrorMessage(error));
            setLoading(false);
            setOverallStatus('failed');
            setSubmissionInProgress(false);
            return;
          }
          
          console.log('ZKP verification successful');        } else {
          setVerificationStatus(prev => ({ ...prev, validVote: 'failed' }));
          const error = handleVerificationError(
            new Error('Invalid ZKP proof structure'),
            VoteVerificationErrorType.ZKP_VERIFICATION_FAILED
          );
          setError(getErrorMessage(error));
          setLoading(false);
          setOverallStatus('failed');
          setSubmissionInProgress(false);
          return;
        }
          } catch (err) {
        console.error('ZKP verification error:', err);
        setVerificationStatus(prev => ({ ...prev, validVote: 'failed' }));
        setError(getErrorMessage(handleVerificationError(err, VoteVerificationErrorType.ZKP_VERIFICATION_FAILED)));
        setLoading(false);
        setOverallStatus('failed');
        setSubmissionInProgress(false);
        return;
      }
        // All checks passed, encrypt and submit the vote
      // Encrypt each vote using the Paillier public key
      // Note: We encrypt the value 1 to represent one vote for the candidate
      const encryptedVotes = votesToVerify.map(vote => ({
        position_id: vote.position_id,
        candidate_id: vote.candidate_id,
        encrypted_vote: encryptPaillierVote(key, 1) // Encrypt the value 1, not the candidate ID
      }));
      // Submit the verified and encrypted votes to the backend
      const submitRes = await fetch(`${API_URL}/elections/${eId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user?.student_id,
          votes: encryptedVotes
        })
      });      if (!submitRes.ok) {
        // Parse the actual error message from the backend
        try {
          const errorData = await submitRes.json();
          const errorMessage = errorData.error || 'Failed to submit encrypted votes.';
          
          // If user already voted, redirect instead of showing error
          if (errorMessage.includes('already voted')) {
            console.log('Vote submission failed - user already voted, redirecting to votes page');
            setSubmissionInProgress(false);
            router.push('/user/votes');
            return;
          }
          
          setError(errorMessage);
        } catch {
          setError('Failed to submit encrypted votes.');
        }
        setOverallStatus('failed');
        setSubmissionInProgress(false);
        return;
      }// Vote submitted successfully - leave the voting session
      try {
        await fetch(`${API_URL}/elections/${eId}/leave_voting_session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voter_id: user?.student_id })
        });
      } catch (sessionError) {
        console.error('Failed to leave voting session after successful vote:', sessionError);
        // Don't fail the overall process if this fails
      }setOverallStatus('success');
      setError(null);
      // Redirect to vote review page after a short delay
      setTimeout(() => {
        router.push(`/user/votes/vote-review?election_id=${eId}&student_id=${user?.student_id}`);
      }, 1800);    } catch {
      setOverallStatus('failed');
      setError('An error occurred during vote verification or encryption.');
      setSubmissionInProgress(false);
    } finally {
      setSubmissionInProgress(false);
    }
  }, [user, router, submissionInProgress]);  useEffect(() => {
    const initVerification = async () => {
      // Prevent duplicate initialization
      if (initializationStarted.current) {
        console.log('Verification already started, skipping duplicate initialization...');
        return;
      }
      
      initializationStarted.current = true;
      
      try {
        // Get election ID and votes from URL parameters
        const eId = searchParams ? searchParams.get('election_id') : null;
        const votesParam = searchParams ? searchParams.get('votes') : null;
          if (!eId || !votesParam) {
          setError('Missing election information');
          setLoading(false);
          setSubmissionInProgress(false);
          return;
        }

        setElectionId(eId);
        
        // Parse votes data
        const parsedVotes = JSON.parse(decodeURIComponent(votesParam));
        setVotes(parsedVotes);
        
        // Fetch election details
        const electionRes = await fetch(`${API_URL}/elections`);
        const elections = await electionRes.json();
        const election = elections.find((e: { election_id: number; election_name: string }) => 
          String(e.election_id) === eId
        );
          if (!election) {
          setError('Election not found');
          setLoading(false);
          setSubmissionInProgress(false);
          return;
        }
        
        setElectionName(election.election_name);

        // Fetch crypto config (public key) for this election
        const cryptoRes = await fetch(`${API_URL}/crypto_configs/election/${eId}?key_type=threshold_elgamal`);        if (!cryptoRes.ok) {
          setError('Failed to get encryption key');
          setLoading(false);
          setSubmissionInProgress(false);
          return;
        }
        const cryptoData = await cryptoRes.json();
        const key = cryptoData.public_key;
        setPublicKey(key);
        // Format the public key for display
        const formattedKey = formatElGamalPublicKey(key);
        console.log('Using public key:', formattedKey);
        // Start verification process
        await verifyVotes(eId, parsedVotes, key);      } catch (err) {
        // Reset initialization flag on error so user can retry if needed
        initializationStarted.current = false;
        
        // Use our error handling utility
        const verificationError = handleVerificationError(err, VoteVerificationErrorType.UNKNOWN_ERROR);
        const errorMessage = getErrorMessage(verificationError);
        
        console.error('Verification initialization error:', verificationError);
        setError(errorMessage);
        setLoading(false);
        setOverallStatus('failed');
        setSubmissionInProgress(false);
      }
    };
    
    initVerification();
  }, [searchParams, verifyVotes]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center"
      style={{ 
        minHeight: '100vh', 
        width: '100vw', 
        background: 'linear-gradient(135deg, #f9fafb 100%, #f9fafb 100%, #fef9c3 50%, #fef9c3 100%)' 
      }}
    >
      <Image src="/usep-bg.jpg" alt="bg" fill style={{ objectFit: 'cover', opacity: 0.08, zIndex: 0 }} />
      <div className="z-10 flex flex-col items-center w-full">
        <SystemLogo2 width={200} className="mb-8" />
        <div
          className="max-w-3xl w-full bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200 mx-auto"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          <h2 className="text-2xl font-bold text-center mb-6 text-red-700">Vote Verification</h2>
          {loading ? (
            <div className="flex flex-col items-center">
              <Loader4 size={100} className="mb-6" />
              <p className="text-gray-700 font-medium text-center">
                Verifying your vote for {electionName}...
              </p>
              <div className="w-full mt-8 space-y-4">
                <VerificationStep 
                  title="Verifying you haven't voted before"
                  status={verificationStatus.uniqueVote}
                />
                <VerificationStep 
                  title="Proving your vote is valid without revealing content"
                  status={verificationStatus.validVote} 
                />
                <VerificationStep 
                  title="Confirming vote follows election rules"
                  status={verificationStatus.followsRules} 
                />
              </div>
             
            </div>
          ) : overallStatus === 'success' ? (
            <div className="text-center">
              <motion.div 
                className="mx-auto w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4"
                initial={{ scale: 0 as number }}
                animate={{ scale: 1 as number }}
                transition={{ type: "spring" as const, damping: 10, stiffness: 100 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </motion.div>
              <h3 className="text-xl font-bold mb-2 text-green-700">Vote Successfully Verified!</h3>
              <p className="mb-4 text-green-700">Your vote has been securely encrypted and recorded.</p>
              <p className="text-sm text-gray-500">Redirecting back to elections page...</p>
            </div>
          ) : (
            <div className="text-center">
              <motion.div 
                className="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4"
                initial={{ scale: 0 as number }}
                animate={{ scale: 1 as number }}
                transition={{ type: "spring" as const, damping: 10, stiffness: 100 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </motion.div>
              <h3 className="text-xl font-bold mb-2 text-red-600">Verification Failed</h3>
              <p className="mb-6 text-red-600">{error}</p>
              <button
                onClick={() => router.push('/user/votes')}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
              >
                Return to Elections
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VerificationStep({ title, status }: { title: string, status: 'pending' | 'verified' | 'failed' }) {
  let textColor = 'text-gray-500';
  if (status === 'verified') textColor = 'text-green-700';
  else if (status === 'failed') textColor = 'text-red-600';
  return (
    <div className="flex items-center">
      <div className={`w-6 h-6 rounded-full mr-3 flex items-center justify-center
        ${status === 'pending' ? 'bg-gray-200' : 
          status === 'verified' ? 'bg-green-500' : 'bg-red-500'}`}
      >
        {status === 'pending' ? (
          <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse"></div>
        ) : status === 'verified' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </div>      <span className={`text-sm font-medium ${textColor}`}>{title}</span>
    </div>
  );
}

export default function VoteVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ 
          minHeight: '100vh', 
          width: '100vw', 
          background: 'linear-gradient(135deg, #f9fafb 100%, #f9fafb 100%, #fef9c3 50%, #fef9c3 100%)' 
        }}
      >
        <Image src="/usep-bg.jpg" alt="bg" fill style={{ objectFit: 'cover', opacity: 0.08, zIndex: 0 }} />
        <div className="z-10 flex flex-col items-center w-full">
          <SystemLogo2 width={200} className="mb-8" />
          <div
            className="max-w-3xl w-full bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200 mx-auto"
            style={{ maxHeight: '80vh', overflowY: 'auto' }}
          >
            <h2 className="text-2xl font-bold text-center mb-6">Vote Verification</h2>
            <div className="flex flex-col items-center">
              <Loader4 size={100} className="mb-6" />
              <p className="text-gray-700 font-medium text-center">
                Loading verification process...
              </p>
            </div>
          </div>
        </div>
      </div>
    }>
      <VoteVerifyContent />
    </Suspense>
  );
}