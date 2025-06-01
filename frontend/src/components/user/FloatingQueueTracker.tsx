'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface FloatingQueueTrackerProps {
  electionId: string;
  userId: string;
}

export default function FloatingQueueTracker({ electionId, userId }: FloatingQueueTrackerProps) {
  const router = useRouter();
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    // Check if user is in queue from sessionStorage
    const queueData = sessionStorage.getItem(`queue_${electionId}_${userId}`);
    if (!queueData) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
      // Poll for queue position updates
    const pollQueue = async () => {
      try {
        const response = await fetch(`${API_URL}/elections/${electionId}/waitlist/position?voter_id=${userId}`);

        if (response.ok) {
          const data = await response.json();
          setQueuePosition(data.position);
          
          // Calculate time remaining (10-15 minutes per person ahead)
          if (data.position > 1) {
            const avgTimePerVoter = 12.5; // minutes
            const totalMinutes = (data.position - 1) * avgTimePerVoter;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = Math.round(totalMinutes % 60);
            
            if (hours > 0) {
              setTimeRemaining(`~${hours}h ${minutes}m`);
            } else {
              setTimeRemaining(`~${minutes}m`);
            }
          } else {
            setTimeRemaining('Your turn!');
          }
          
          // Auto-redirect when it's user's turn
          // (Removed: do not redirect automatically)
          // if (data.position === 1) {
          //   setTimeout(() => {
          //     sessionStorage.removeItem(`queue_${electionId}_${userId}`);
          //     router.push(`/user/votes/access-check?election_id=${electionId}`);
          //   }, 2000);
          // }
        } else if (response.status === 404) {
          // User no longer in queue
          sessionStorage.removeItem(`queue_${electionId}_${userId}`);
          setIsVisible(false);
        }
      } catch (error) {
        console.error('Error polling queue position:', error);
      }
    };

    // Initial poll
    pollQueue();
    
    // Poll every 30 seconds
    const interval = setInterval(pollQueue, 30000);
    
    return () => clearInterval(interval);
  }, [electionId, userId, router]);

  const handleGoToWaitlist = () => {
    router.push(`/user/votes/waitlist?election_id=${electionId}`);
  };

  const handleExitQueue = async () => {
    try {
      await fetch(`${API_URL}/elections/${electionId}/waitlist/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voter_id: userId })
      });
      
      sessionStorage.removeItem(`queue_${electionId}_${userId}`);
      setIsVisible(false);
      setShowExitConfirm(false);
    } catch (error) {
      console.error('Error leaving queue:', error);
    }
  };

  if (!isVisible || queuePosition === null) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <div className={`bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-300 ${
            isMinimized ? 'w-16 h-16' : 'w-80'
          }`}>
            {isMinimized ? (
              // Minimized state
              <button
                onClick={() => setIsMinimized(false)}
                className="w-full h-full flex items-center justify-center bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition-colors"
                title="Queue Tracker"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/>
                  <path d="M8 3.5a.5.5 0 0 1 .5.5v4h3a.5.5 0 0 1 0 1h-3.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/>
                </svg>
              </button>
            ) : (
              // Expanded state
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Queue Position</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setIsMinimized(true)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Minimize"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowExitConfirm(true)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Exit Queue"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-center">
                    {queuePosition === 1 ? (
                      <div className="text-green-600 font-bold text-lg animate-pulse">
                        🎉 You&apos;re next!
                      </div>
                    ) : (
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          #{queuePosition}
                        </div>
                        <div className="text-sm text-gray-600">
                          in queue
                        </div>
                      </div>
                    )}
                  </div>

                  {timeRemaining && (
                    <div className="text-center">
                      <div className="text-sm text-gray-500">
                        Estimated wait time:
                      </div>
                      <div className="font-medium text-gray-700">
                        {timeRemaining}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleGoToWaitlist}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      View Queue
                    </button>
                    <button
                      onClick={() => setShowExitConfirm(true)}
                      className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                    >
                      Exit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Exit Queue Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Exit Queue?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to exit the queue? You&apos;ll lose your current position (#{queuePosition}) and will need to rejoin at the end if you want to vote later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExitQueue}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Exit Queue
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
