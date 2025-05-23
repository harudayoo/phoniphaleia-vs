import React, { useEffect, useState } from 'react';
import Modal from '../Modal';

interface Authority {
  authority_id: number;
  authority_name: string;
  contact_info?: string;
  created_at?: string;
}

interface TrustedAuthoritiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  electionId: number | null;
}

const TrustedAuthoritiesModal: React.FC<TrustedAuthoritiesModalProps> = ({ isOpen, onClose, electionId }) => {
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !electionId) return;
    setLoading(true);
    setError(null);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/crypto_configs/${electionId}/trusted-authorities`)
      .then(res => res.json())
      .then(data => {
        setAuthorities(data.authorities || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch trusted authorities');
        setLoading(false);
      });
  }, [isOpen, electionId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Trusted Authorities" size="md">
      {loading ? (
        <div className="text-center py-6 text-gray-500">Loading...</div>
      ) : error ? (
        <div className="text-center py-6 text-red-600">{error}</div>
      ) : authorities.length === 0 ? (
        <div className="text-center py-6 text-gray-500">No trusted authorities found for this election.</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {authorities.map(auth => (
            <li key={auth.authority_id} className="py-3 px-2 flex flex-col">
              <span className="font-semibold text-gray-800">{auth.authority_name}</span>
              {auth.contact_info && <span className="text-sm text-gray-600">{auth.contact_info}</span>}
              {auth.created_at && <span className="text-xs text-gray-400">Created: {new Date(auth.created_at).toLocaleString()}</span>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

export default TrustedAuthoritiesModal;
