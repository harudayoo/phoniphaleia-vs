'use client';
import { FC } from 'react';
import Modal from '@/components/Modal';
import { motion } from 'framer-motion';

interface Candidate {
  candidate_id: number;
  fullname: string;
  position_id?: number;
  party?: string;
  candidate_desc?: string;
  photo_url?: string;
}

interface CandidateDetailModalProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
}

const CandidateDetailModal: FC<CandidateDetailModalProps> = ({ candidate, isOpen, onClose }) => {
  if (!candidate) return null;

  const containerAnimation = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemAnimation = {
    hidden: { y: 20, opacity: 0 },
    show: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={candidate.fullname}
      size="md"
    >
      <motion.div 
        className="p-2"
        variants={containerAnimation}
        initial="hidden"
        animate="show"
      >
        <motion.div 
          className="flex flex-col items-center mb-6"
          variants={itemAnimation}
        >
          <motion.div 
            className="w-36 h-36 relative mb-4 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >            {candidate.photo_url ? (
              <img
                src={candidate.photo_url}
                alt={`Photo of ${candidate.fullname}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error(`Failed to load photo for ${candidate.fullname}: ${candidate.photo_url}`);
                  e.currentTarget.src = '/user-placeholder.png'; 
                  e.currentTarget.onerror = null;
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                No photo available
              </div>
            )}
          </motion.div>
          
          <motion.h3 
            className="font-medium text-xl text-center mb-1"
            variants={itemAnimation}
          >
            {candidate.fullname}
          </motion.h3>
          
          {candidate.party && (
            <motion.div 
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 mb-4"
              variants={itemAnimation}
            >
              {candidate.party}
            </motion.div>
          )}
        </motion.div>
        
        {candidate.candidate_desc ? (
          <motion.div 
            className="bg-gray-50 rounded-lg p-4 text-gray-700"
            variants={itemAnimation}
            whileHover={{ boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)" }}
          >
            <h4 className="font-medium mb-2 text-gray-900">Candidate Profile</h4>
            <p>{candidate.candidate_desc}</p>
          </motion.div>
        ) : (
          <motion.div 
            className="text-center text-gray-500 italic"
            variants={itemAnimation}
          >
            No additional information available
          </motion.div>
        )}
      </motion.div>
    </Modal>
  );
};

export default CandidateDetailModal;
