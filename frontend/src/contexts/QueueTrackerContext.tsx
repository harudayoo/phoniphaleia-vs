'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface QueueTrackerContextType {
  isInQueue: boolean;
  electionId: string | null;
  userId: string | null;
  setQueueStatus: (inQueue: boolean, electionId?: string, userId?: string) => void;
}

const QueueTrackerContext = createContext<QueueTrackerContextType | undefined>(undefined);

interface QueueTrackerProviderProps {
  children: ReactNode;
}

export function QueueTrackerProvider({ children }: QueueTrackerProviderProps) {
  const [isInQueue, setIsInQueue] = useState(false);
  const [electionId, setElectionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const setQueueStatus = (inQueue: boolean, electionId?: string, userId?: string) => {
    setIsInQueue(inQueue);
    if (inQueue && electionId && userId) {
      setElectionId(electionId);
      setUserId(userId);
    } else {
      setElectionId(null);
      setUserId(null);
    }
  };

  return (
    <QueueTrackerContext.Provider value={{
      isInQueue,
      electionId,
      userId,
      setQueueStatus
    }}>
      {children}
    </QueueTrackerContext.Provider>
  );
}

export function useQueueTracker() {
  const context = useContext(QueueTrackerContext);
  if (context === undefined) {
    throw new Error('useQueueTracker must be used within a QueueTrackerProvider');
  }
  return context;
}
