'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useUser } from '@/contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import CandidateDetailModal from '@/components/user/CandidateDetailModal';
import ArrowUpScrollToTop from '@/components/ArrowUpScrollToTop';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Candidate {
  candidate_id: number;
  fullname: string;
  position_id?: number; // Optional since it's grouped by position
  party?: string;
  candidate_desc?: string;
  photo_url?: string;
  photo_path?: string; // Added to support backend field
}

interface Position {
  position_id: number;
  position_name: string;
  description?: string;
  candidates: Candidate[];
}

// Separate component for ExitConfirmationModal to prevent re-render loops
interface ExitConfirmationModalProps {
  onCancel: () => void;
  onExit: () => void;
}

const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({ onCancel, onExit }) => {
  console.log('ExitConfirmationModal is rendering');
    const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Cancel button clicked');
    // Call the onCancel callback directly without any state updates
    onCancel();
  };

  const handleExit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Exit button clicked');
    // Call the onExit callback directly without any state updates
    onExit();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop, not the modal content
    if (e.target === e.currentTarget) {
      console.log('Backdrop clicked');
      onCancel();
    }
  };

  const handleModalClick = (e: React.MouseEvent) => {
    // Prevent event bubbling to backdrop
    e.stopPropagation();
  };
  return (
    <div 
      className="fixed inset-0 bg-black/70 bg-opacity-75 flex items-center justify-center z-[9999]"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-lg"
        onClick={handleModalClick}
      >
        <h3 className="text-lg font-semibold mb-4">Confirm Exit</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to exit? Your current selections will be lost.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md border border-gray-500"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleExit}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md"
            type="button"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};

function CastVoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useUser();
  const electionId = searchParams.get('election_id');
  const [positions, setPositions] = useState<Position[]>([]);
  const [selected, setSelected] = useState<{ [positionId: number]: number | null }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCandidate, setShowCandidate] = useState<Candidate | null>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Start voting session first to ensure proper counting
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.student_id && electionId) {
          try {
            console.log('Starting voting session...');
            const sessionResponse = await fetch(`${API_URL}/elections/${electionId}/start_voting_session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ voter_id: user.student_id })
            });
            
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              console.log('Voting session started:', sessionData);
            } else {
              const errorText = await sessionResponse.text();
              console.warn('Failed to start voting session:', errorText);
              // Don't fail the whole page if session start fails
            }
          } catch (sessionError) {
            console.warn('Error starting voting session:', sessionError);
            // Don't fail the whole page if session start fails
          }
        }

        // Get election details
        const electionRes = await fetch(`${API_URL}/elections`);
        const elections: { election_id: number; org_id: number }[] = await electionRes.json();
        const election = elections.find((e) => String(e.election_id) === String(electionId));
        
        if (!election) {
          setError('Election not found.');
          setLoading(false);
          return;
        }

        // Directly fetch candidates grouped by position for this election
        const candRes = await fetch(`${API_URL}/elections/${electionId}/candidates`);
        const positionsWithCandidates: Position[] = await candRes.json();
        
        // Format positions and fix photo URLs
        const formattedPositions = positionsWithCandidates.map(pos => ({
          ...pos,
          candidates: Array.isArray(pos.candidates) ? pos.candidates.map(cand => {
            // Map photo_path to photo_url for frontend compatibility
            let photoUrl = cand.photo_url || cand.photo_path;
            if (photoUrl) {
              // Clean up the URL construction
              if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
                // Already a full URL, use as is
                photoUrl = photoUrl;
              } else if (photoUrl.startsWith('/api/')) {
                // Remove /api prefix and add base URL
                photoUrl = `${API_URL}${photoUrl.substring(4)}`;
              } else if (photoUrl.startsWith('/uploads/')) {
                // Add base URL to uploads path
                photoUrl = `${API_URL}${photoUrl}`;
              } else if (photoUrl.includes('uploads/')) {
                // Extract filename and construct proper path
                const filename = photoUrl.split('/').pop();
                photoUrl = `${API_URL}/uploads/photos/${filename}`;
              } else {
                // Assume it's just a filename
                photoUrl = `${API_URL}/uploads/photos/${photoUrl}`;
              }
            }
            
            console.log('Candidate photo URL:', cand.fullname, photoUrl); // Debug log
            
            return {
              ...cand,
              photo_url: photoUrl
            };
          }) : []
        }));
          setPositions(formattedPositions);        // Initialize selection state
        const initialSelected: { [positionId: number]: number | null } = {};
        formattedPositions.forEach(pos => {
          initialSelected[pos.position_id] = null;
        });
        setSelected(initialSelected);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load election data.');
      }
      setLoading(false);
    };
    
    if (electionId) fetchData();
  }, [electionId]);
  // Helper function to leave voting session - memoized with useCallback
  const leaveVotingSession = useCallback(async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.student_id && electionId) {
      try {
        console.log(`Attempting to leave voting session for election ${electionId}, voter ${user.student_id}`);
        
        const response = await fetch(`${API_URL}/elections/${electionId}/leave_voting_session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voter_id: user.student_id })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Successfully left voting session:', data);
          return true;
        } else {
          const errorText = await response.text();
          console.error('Failed to leave voting session:', response.status, errorText);
          return false;
        }
      } catch (error) {
        console.error('Error leaving voting session:', error);
        return false;
      }
    }
    return false;
  }, [electionId]);

  // Handle Return to Elections button click
  const handleReturnToElections = async () => {
    console.log('Return to Elections button clicked');
    setShowExitConfirmation(true);
  };  // Add new function to handle confirmed exit
  const handleConfirmedExit = useCallback(async () => {
    console.log('Exit confirmed by user');
    
    // Close the modal first to prevent any rendering issues
    setShowExitConfirmation(false);
    
    try {
      console.log('Starting exit process...');
      
      // First decrement voters count
      console.log(`Calling decrement API for election ${electionId}`);
      const decrementRes = await fetch(`${API_URL}/elections/${electionId}/decrement_voters_count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!decrementRes.ok) {
        console.error('Failed to decrement voters count');
        // Continue with exit process even if decrement fails
      } else {
        const decrementData = await decrementRes.json();
        console.log('Decrement successful:', decrementData);
      }

      // Then leave voting session (existing functionality)
      console.log('Leaving voting session...');
      const sessionResult = await leaveVotingSession();
      console.log('Leave session result:', sessionResult);
      
    } catch (error) {
      console.error('Error during exit process:', error);
    }
    
    // Always redirect to votes page regardless of API call results
    console.log('Redirecting to /user/votes');
    router.push('/user/votes');
  }, [electionId, leaveVotingSession, router]);
  // Cleanup effect to handle leaving the voting session
  useEffect(() => {
    const decrementVotersCount = async () => {
      try {
        const response = await fetch(`${API_URL}/elections/${electionId}/decrement_voters_count`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (!response.ok) {
          console.error('Failed to decrement voters count');
        }
      } catch (error) {
        console.error('Error decrementing voters count:', error);
      }
    };

    const handleBeforeUnload = async () => {
      await decrementVotersCount();
      await leaveVotingSession();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        decrementVotersCount();
        leaveVotingSession();
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function - only remove event listeners, don't decrement count
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [electionId, leaveVotingSession]);

  const handleSelect = (positionId: number, candidateId: number) => {
    setSelected(prev => ({ ...prev, [positionId]: candidateId }));
  };  const handleSubmit = () => {
    // Validate all positions have selections
    for (const pos of positions) {
      if (!selected[pos.position_id]) {
        setError(`Please select a candidate for ${pos.position_name}.`);
        setSuccess(null);
        return;
      }
    }
    
    // Format votes for verification
    const votes = Object.entries(selected).map(([positionId, candidateId]) => ({
      position_id: parseInt(positionId),
      candidate_id: candidateId as number
    }));
    
    // Prepare votes data for URL parameter
    const votesParam = encodeURIComponent(JSON.stringify(votes));
    
    // Redirect to verify page with election ID and votes
    router.push(`/user/votes/vote-verify?election_id=${electionId}&votes=${votesParam}`);
    
    setError(null);
    setSuccess('Redirecting to vote verification...');  };
  // Add scroll detection for showing/hiding the scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      // Show the button when user scrolls down 80px from the top
      setShowScrollToTop(window.scrollY > 80);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Initial check in case page is already scrolled
    handleScroll();
    
    // Clean up the event listener
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start py-8 px-4 md:px-6" style={{
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Place the background image behind everything */}
      <Image src="/usep-bg.jpg" alt="bg" fill style={{ objectFit: 'cover', opacity: 0.1, zIndex: 0 }} />
      {/* Gradient overlay above the image, below content */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(120deg,
            rgba(255,230,230,0.35) 0%,
            rgba(255,230,230,0.18) 10%,
            rgba(255,255,255,0.08) 40%,
            rgba(255,255,255,0.02) 70%,
            rgba(255,255,255,0.0) 100%)`,
        }}
      />      {/* Return to Elections button at the top-left */}
      <div className="absolute top-6 left-6 z-30">
        <button
          type="button"
          className="px-4 py-2 hover:text-red-950 text-red-700 text-shadow-md font-medium transition flex items-center"
          onClick={handleReturnToElections}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-2" viewBox="0 0 16 16">
            <path d="M15 8a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 7.5H14.5A.5.5 0 0 1 15 8z"/>
          </svg>
          Return to Elections
        </button>
      </div>
      <div className="relative z-20 w-full max-w-3xl mx-auto flex flex-col items-center">        <motion.div 
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded mb-8 shadow w-full"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 25 
          }}
          whileHover={{ 
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
            scale: 1.01
          }}
        >
          <div className="flex items-start">
            <motion.svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              fill="currentColor" 
              className="mt-0.5 mr-3 flex-shrink-0" 
              viewBox="0 0 16 16"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </motion.svg>
            <div>
              <motion.p 
                className="font-semibold mb-1"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Voting Rules:
              </motion.p>
              <motion.ul 
                className="list-disc pl-5 space-y-1 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.li initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                  You may select <b>one candidate per position</b>
                </motion.li>
                <motion.li initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                  You can only vote <b>once per election</b>
                </motion.li>
                <motion.li initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                  Please review your selections before submitting
                </motion.li>
              </motion.ul>
            </div>
          </div>
        </motion.div><AnimatePresence>
          {error && (
            <motion.div 
              className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 w-full text-center border border-red-200 shadow-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <div className="flex justify-center items-center">
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  fill="currentColor" 
                  className="mr-2" 
                  viewBox="0 0 16 16"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, -10, 10, -10, 10, -5, 5, 0] }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </motion.svg>
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {success && (
            <motion.div 
              className="bg-green-100 text-green-700 p-4 rounded-lg mb-6 w-full text-center border border-green-200 shadow-sm"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <div className="flex justify-center items-center">
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  fill="currentColor" 
                  className="mr-2" 
                  viewBox="0 0 16 16"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 0, 360] }}
                  transition={{ 
                    duration: 0.6, 
                    scale: { delay: 0.2 },
                    rotate: { delay: 0.2, duration: 0.5 }
                  }}
                >
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
                </motion.svg>
                {success}
              </div>
            </motion.div>
          )}
        </AnimatePresence>        {loading ? (
          <motion.div 
            className="text-center py-16 w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div 
              className="rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ 
                duration: 1.2, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            ></motion.div>
            <motion.p 
              className="text-lg text-gray-700"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Loading candidates...
            </motion.p>
          </motion.div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="w-full">
            {positions.map(pos => (              <motion.div 
                key={pos.position_id} 
                className="mb-10 bg-white rounded-lg shadow-sm p-6 border border-gray-100"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 20,
                  delay: pos.position_id * 0.1 % 0.5
                }}
                whileHover={{ boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.05)" }}
              >
                <motion.div 
                  className="border-b pb-3 mb-4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="font-semibold text-xl text-gray-800">{pos.position_name}</h3>
                  {pos.description && <div className="text-gray-500 mt-1 text-sm">{pos.description}</div>}
                </motion.div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{pos.candidates.map((cand, candidateIdx) => (
                    <motion.label 
                      key={`${pos.position_id}-${cand.candidate_id}-${candidateIdx}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                        delay: cand.candidate_id * 0.05 % 0.5 // Stagger effect
                      }}
                      className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 hover:bg-green-50 ${
                        selected[pos.position_id] === cand.candidate_id 
                          ? 'border-green-500 bg-green-50 shadow-lg' 
                          : 'border-green-200'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <input
                        type="radio"
                        name={`position-${pos.position_id}`}
                        value={cand.candidate_id}
                        checked={selected[pos.position_id] === cand.candidate_id}
                        onChange={() => handleSelect(pos.position_id, cand.candidate_id)}
                        className="mr-3 mt-1 h-5 w-5 accent-green-500"
                      />
                      
                      <div className="flex flex-1">
                        {cand.photo_url && (
                          <div className="mr-4 flex-shrink-0">
                            <motion.div 
                              className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100"
                              whileHover={{ scale: 1.1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                              <Image 
                                src={cand.photo_url} 
                                alt={`Photo of ${cand.fullname}`}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.log('Image failed to load:', cand.photo_url);
                                  const target = e.currentTarget as HTMLImageElement;
                                  target.src = '/user-placeholder.png'; 
                                  target.onerror = null;
                                }}
                                onLoad={() => console.log('Image loaded successfully:', cand.photo_url)}
                                unoptimized={true}
                                priority={false}
                                placeholder="blur"
                                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rj5m9beMZcjOFdgNZqOE2eU5iq9lzYwf8Vf3v/Z"
                              />
                            </motion.div>
                          </div>
                        )}
                        
                        {!cand.photo_url && (
                          <div className="mr-4 flex-shrink-0">
                            <motion.div 
                              className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center"
                              whileHover={{ scale: 1.1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="text-gray-400" viewBox="0 0 16 16">
                                <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                                <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
                              </svg>
                            </motion.div>
                          </div>
                        )}
                        
                        <div className="flex flex-col flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">{cand.fullname}</span>
                            {cand.party && (
                              <motion.span 
                                className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                {cand.party}
                              </motion.span>
                            )}
                          </div>
                          
                          {cand.candidate_desc && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{cand.candidate_desc}</p>
                          )}
                          
                          <motion.button
                            type="button"
                            className="self-start mt-auto text-sm text-blue-600 hover:text-blue-800 flex items-center"
                            onClick={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation(); 
                              setShowCandidate(cand); 
                            }}
                            whileHover={{ scale: 1.05, x: 3 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            View profile
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="ml-1" viewBox="0 0 16 16">
                              <path fillRule="evenodd" d="M8 3.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5H4a.5.5 0 0 1 0-1h3.5V4a.5.5 0 0 1 .5-.5z"/>
                              <path fillRule="evenodd" d="M7.5 8a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H8.5V12a.5.5 0 0 1-1 0V8z"/>
                            </svg>
                          </motion.button>
                        </div>
                      </div>                    </motion.label>
                  ))}
                </div>
              </motion.div>
            ))}
              <div className="flex justify-end mt-6 mb-12">
              <motion.button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-10 py-3 rounded-lg shadow transition flex items-center"
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)"
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15
                }}
              >
                Verify Votes
                <motion.svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  fill="currentColor" 
                  className="ml-2" 
                  viewBox="0 0 16 16"
                  initial={{ x: 0 }}
                  animate={{ x: [0, 5, 0] }}
                  transition={{
                    repeat: Infinity,
                    repeatType: "reverse",
                    duration: 1.5,
                    ease: "easeInOut"
                  }}
                >
                  <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                </motion.svg>
              </motion.button>
            </div>
          </form>
        )}
          {/* Candidate details modal */}
        <CandidateDetailModal
          candidate={showCandidate}
          isOpen={!!showCandidate}
          onClose={() => setShowCandidate(null)}
        />      </div>      {/* Add the confirmation modal */}      {showExitConfirmation && (
        <ExitConfirmationModal 
          onCancel={() => {
            console.log("Cancel callback triggered");
            setShowExitConfirmation(false);
          }} 
          onExit={() => {
            console.log("Exit callback triggered");
            handleConfirmedExit();
          }} 
        />
      )}
      
      {/* Scroll to top button */}
      <ArrowUpScrollToTop show={showScrollToTop} />
    </div>
  );
}

export default function CastVotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative flex flex-col items-center justify-start py-8 px-4 md:px-6" style={{
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Image src="/usep-bg.jpg" alt="bg" fill style={{ objectFit: 'cover', opacity: 0.1, zIndex: 0 }} />
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `linear-gradient(120deg,
              rgba(255,230,230,0.35) 0%,
              rgba(255,230,230,0.18) 10%,
              rgba(255,255,255,0.08) 40%,
              rgba(255,255,255,0.02) 70%,
              rgba(255,255,255,0.0) 100%)`,
          }}
        />
        <div className="relative z-20 w-full max-w-3xl mx-auto flex flex-col items-center">
          <div className="text-center py-16 w-full">
            <div className="rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto mb-4 animate-spin"></div>
            <p className="text-lg text-gray-700">Loading voting interface...</p>
          </div>
        </div>
      </div>
    }>
      <CastVoteContent />
    </Suspense>
  );
}
