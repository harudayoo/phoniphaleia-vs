'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SystemLogo2 from '@/components/SystemLogo2';
import Loader4 from '@/components/Loader4';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import { QueueTrackerProvider, useQueueTracker } from '@/contexts/QueueTrackerContext';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface WaitlistData {
  position: number;
  total_waiting: number;
  estimated_wait: number;
}

interface Election {
  election_id: number;
  election_name: string;
  max_concurrent_voters: number;
  voters_count: number;
}

function WaitlistContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { setQueueStatus } = useQueueTracker();
  const electionId = searchParams.get('election_id');
  const voterId = searchParams.get('voter_id') || user?.student_id;
  
  const [waitlistData, setWaitlistData] = useState<WaitlistData | null>(null);
  const [electionData, setElectionData] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [showNextVoterNotif, setShowNextVoterNotif] = useState(false);
  const [timeUntilNext, setTimeUntilNext] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch election data
  const fetchElectionData = useCallback(async () => {
    if (!electionId) return;
    
    try {
      const response = await fetch(`${API_URL}/elections`);
      if (response.ok) {
        const elections: Election[] = await response.json();
        const election = elections.find(e => String(e.election_id) === String(electionId));
        if (election) {
          setElectionData(election);
        }
      }
    } catch (error) {
      console.error('Error fetching election data:', error);
    }
  }, [electionId]);

  // Fetch waitlist position
  const fetchWaitlistData = useCallback(async () => {
    if (!electionId || !voterId) return;
    
    try {
      const response = await fetch(`${API_URL}/elections/${electionId}/waitlist/position?voter_id=${voterId}`);
      if (response.ok) {
        const data = await response.json();
        setWaitlistData(data);
        setLastUpdated(new Date());
          // Calculate estimated wait time (12-15 minutes per person ahead)
        const estimatedMinutes = Math.max(5, (data.position - 1) * 12);
        setTimeUntilNext(estimatedMinutes * 60);
        
        // Show next voter notification if they're first in line
        if (data.position === 1) {
          setShowNextVoterNotif(true);
        } else {
          setShowNextVoterNotif(false);
        }
          // Check if voter can now access the election (if first in line)
        if (data.position === 1) {
          // Try to grant access directly - the backend will handle waitlist activation and voters_count increment
          const grantAccessRes = await fetch(`${API_URL}/elections/${electionId}/access-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voter_id: voterId, grant_access: true })
          });
          if (grantAccessRes.ok) {
            const grantAccessData = await grantAccessRes.json();
            if (grantAccessData.access_granted) {
              // Successfully granted access - redirect to cast page
              router.replace(`/user/votes/cast?election_id=${electionId}`);
              return;
            }
          }
        }
      } else if (response.status === 404) {
        // Voter not in waitlist - redirect to access check
        router.replace(`/user/votes/access-check?election_id=${electionId}`);
        return;
      }
    } catch (error) {
      console.error('Error fetching waitlist data:', error);
      setError('Failed to fetch waitlist information');
    } finally {
      setLoading(false);
    }
  }, [electionId, voterId, router]);
  // Initial data fetch
  useEffect(() => {
    fetchElectionData();
    fetchWaitlistData();
    
    // Ensure queue status is set in sessionStorage and context when page loads
    if (electionId && voterId) {
      const queueKey = `queue_${electionId}_${voterId}`;
      sessionStorage.setItem(queueKey, JSON.stringify({
        electionId,
        voterId,
        electionName: electionData?.election_name || 'Unknown Election',
        timestamp: Date.now()
      }));
      
      // Update queue tracker context
      setQueueStatus(true, electionId, voterId);
    }
  }, [fetchElectionData, fetchWaitlistData, electionId, voterId, setQueueStatus, electionData?.election_name]);

  // Poll for position updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWaitlistData();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [fetchWaitlistData]);

  // Countdown timer
  useEffect(() => {
    if (timeUntilNext > 0) {
      const timer = setInterval(() => {
        setTimeUntilNext(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeUntilNext]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const confirmLeaveWaitlist = async () => {
    if (!electionId || !voterId) return;
    
    try {
      const response = await fetch(`${API_URL}/elections/${electionId}/waitlist/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: voterId })
      });
      
      if (response.ok) {
        // Remove queue status from sessionStorage and context
        const queueKey = `queue_${electionId}_${voterId}`;
        sessionStorage.removeItem(queueKey);
        setQueueStatus(false);
        
        toast.success('Successfully left the queue');
        // Force redirect to votes page instead of letting useEffect handle it
        window.location.href = '/user/votes';
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to leave queue');
      }
    } catch (error) {
      console.error('Error leaving waitlist:', error);
      toast.error('Failed to leave queue');
    }
  };
  const confirmExploreWhileWaiting = () => {
    // Store waitlist state in sessionStorage for persistent tracking
    const queueKey = `queue_${electionId}_${voterId}`;
    sessionStorage.setItem(queueKey, JSON.stringify({
      electionId,
      voterId,
      electionName: electionData?.election_name,
      position: waitlistData?.position,
      totalWaiting: waitlistData?.total_waiting,
      timestamp: Date.now()
    }));
    
    // Update queue tracker context
    if (electionId && voterId) {
      setQueueStatus(true, electionId, voterId);
    }
    
    toast.success('You can now explore while staying in the queue!');
    router.push('/user/votes');
  };
  if (loading && !waitlistData) {
    return (
      <UserLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <SystemLogo2 width={150} className="mb-6" />
          <Loader4 size={80} className="mb-4" />
          <p className="text-gray-600">Loading your queue position...</p>
        </div>
      </UserLayout>
    );
  }

  if (error) {
    return (
      <UserLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Queue Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/user/votes')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Return to Elections
            </button>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      {/* Next voter floating notification */}
      {showNextVoterNotif && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span className="font-semibold">You&apos;re next! A slot will open soon...</span>
          </div>
        </div>
      )}      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Election Queue</h1>
          <p className="text-gray-600">
            You&apos;re in line for: <strong>{electionData?.election_name}</strong>
          </p>
        </div>        {/* Queue Status Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="text-center">
            {/* Position Display */}
            <div className="mb-6">
              <div className="text-6xl font-bold text-red-600 mb-2">
                #{waitlistData?.position}
              </div>
              <p className="text-lg text-gray-700">
                You are <strong>{waitlistData?.position === 1 ? 'next' : `${waitlistData?.position}${getOrdinalSuffix(waitlistData?.position || 0)}`}</strong> in line
              </p>
              <p className="text-sm text-gray-500 mt-1">
                out of {waitlistData?.total_waiting} voter{waitlistData?.total_waiting !== 1 ? 's' : ''} waiting
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-red-700 h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.max(10, ((waitlistData?.total_waiting || 1) - (waitlistData?.position || 1) + 1) / (waitlistData?.total_waiting || 1) * 100)}%` 
                  }}
                ></div>
              </div>              <p className="text-xs text-gray-500 mt-2">
                {((waitlistData?.total_waiting || 0) - (waitlistData?.position || 0) + 1)} / {waitlistData?.total_waiting} positions filled
              </p>
            </div>

            {/* Estimated Wait Time */}
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Estimated Wait Time</h3>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {formatTime(timeUntilNext)}
              </div>
              <p className="text-sm text-blue-700">
                Approximately {Math.ceil(timeUntilNext / 60)} minute{Math.ceil(timeUntilNext / 60) !== 1 ? 's' : ''} remaining
              </p>
              <p className="text-xs text-blue-600 mt-1">
                * Based on 10-15 estimated minutes per voter, this can still change
              </p>
            </div>

            {/* Current Status */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">                  <p className="text-sm text-yellow-700">
                    {waitlistData?.position === 1 
                      ? "You're next! Please stay on this page as you'll be redirected automatically when a slot opens."
                      : `${(waitlistData?.position || 1) - 1} voter${((waitlistData?.position || 1) - 1) !== 1 ? 's' : ''} ahead of you. The page will update automatically.`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
                <span className="ml-2 inline-flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="ml-1">Live updates</span>
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setShowExitModal(true)}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Exit Queue
          </button>
          <button
            onClick={() => setShowExploreModal(true)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Explore While Waiting
          </button>
        </div>
      </div>      {/* Exit Queue Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Exit Queue?</h3>            <p className="text-gray-600 mb-6">
              Are you sure you want to exit the queue? You&apos;ll lose your current position (#{waitlistData?.position}) and will need to rejoin at the end if you want to vote later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmLeaveWaitlist}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Exit Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explore While Waiting Confirmation Modal */}
      {showExploreModal && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Explore While Waiting</h3>            <p className="text-gray-600 mb-6">
              You&apos;ll be redirected to the elections page and can navigate freely. A floating tracker will show your queue position on all pages. You&apos;ll be notified when it&apos;s your turn to vote.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExploreModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Stay Here
              </button>
              <button
                onClick={confirmExploreWhileWaiting}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Start Exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}

// Helper function to get ordinal suffix
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}

export default function WaitlistPage() {
  return (
    <QueueTrackerProvider>
      <Suspense fallback={
        <UserLayout>
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <SystemLogo2 width={150} className="mb-6" />
            <Loader4 size={80} className="mb-4" />
            <p className="text-gray-600">Loading waitlist...</p>
          </div>
        </UserLayout>
      }>
        <WaitlistContent />
      </Suspense>
    </QueueTrackerProvider>
  );
}