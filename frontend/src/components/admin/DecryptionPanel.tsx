import React, { useState, useEffect } from 'react';
import { KeySquare, Lock, Unlock, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { submitPartialDecryption, decryptElectionResults } from '@/services/verificationService';
import { CryptoConfig, getAllCryptoConfigs } from '@/services/cryptoConfigService';
import { API_URL } from '@/config';

interface DecryptionPanelProps {
  electionId: number;
  onDecryptionComplete?: (results: {
    success: boolean;
    results: Array<{
      position_id: number;
      candidate_results: Record<string, number>;
    }>;
  }) => void;
}

interface Authority {
  id: number;
  name: string;
  email: string;
  keyShareId?: number;
  hasSubmitted: boolean;
}

interface PartialDecryption {
  authorityId: number;
  votes: {
    [voteId: string]: {
      id: number;
      partialDecryption: string;
    }
  }
}

interface Vote {
  id: number;
  election_id: number;
  voter_id: number;
  position_id: number;
  vote_data: string;
  created_at: string;
  updated_at: string;
  verification_data?: string;
}

interface KeyShareResponse {
  id: number;
  crypto_config_id: number;
  authority_id: number;
  key_share: string;
  created_at: string;
  updated_at: string;
}

const DecryptionPanel: React.FC<DecryptionPanelProps> = ({ electionId, onDecryptionComplete }) => {
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [cryptoConfig, setCryptoConfig] = useState<CryptoConfig | null>(null);
  const [threshold, setThreshold] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [decrypting, setDecrypting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [partialDecryptions, setPartialDecryptions] = useState<PartialDecryption[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch crypto configs
        const configs = await getAllCryptoConfigs(electionId);
        const elgamalConfig = configs.find(config => config.key_type === 'threshold_elgamal');
        
        if (elgamalConfig) {
          setCryptoConfig(elgamalConfig);
            // Parse metadata to get threshold
          if (elgamalConfig.meta_data) {
            const metadata = JSON.parse(elgamalConfig.meta_data);
            setThreshold(metadata.t || 0);
          }
          
          // Fetch authorities with key shares
          const response = await fetch(`${API_URL}/trusted_authorities/election/${electionId}`, {
            credentials: 'include',
          });
          
          if (response.ok) {
            const authData = await response.json();
              // Fetch key share info for each authority
            const authoritiesWithShares = await Promise.all(authData.map(async (auth: Authority) => {
              try {
                const keyShareResponse = await fetch(`${API_URL}/key_shares/crypto/${elgamalConfig.config_id}/authority/${auth.id}`, {
                  credentials: 'include',
                });
                
                if (keyShareResponse.ok) {
                  const keyShare: KeyShareResponse = await keyShareResponse.json();
                  return {
                    ...auth,
                    keyShareId: keyShare.id,
                    hasSubmitted: false
                  };
                }
                return { ...auth, hasSubmitted: false };              } catch {
                // Silently handle error and continue without key share data
                return { ...auth, hasSubmitted: false };
              }
            }));
            
            setAuthorities(authoritiesWithShares);
          }
          
          // Fetch votes
          const votesResponse = await fetch(`${API_URL}/votes/election/${electionId}`, {
            credentials: 'include',
          });
          
          if (votesResponse.ok) {
            const votesData: Vote[] = await votesResponse.json();
            setVotes(votesData);
          }
        }
      } catch (err) {
        setError('Failed to load decryption data');
        console.error('Error fetching decryption data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (electionId) {
      fetchData();
    }
  }, [electionId]);
  
  const handleAuthorityDecryption = async (authorityId: number, keyShareId: number) => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      // Submit partial decryptions for each vote
      const partialDecs: {
        [voteId: string]: {
          id: number;
          partialDecryption: string;
        }
      } = {};
      
      for (const vote of votes) {
        try {
          const voteData = JSON.parse(vote.vote_data);
          
          const partialDecResult = await submitPartialDecryption({
            encryptedVote: voteData,
            electionId,
            authorityId,
            keyShareId
          });
          
          partialDecs[vote.id] = {
            id: partialDecResult.id,
            partialDecryption: partialDecResult.partialDecryption
          };
        } catch (e) {
          console.error(`Failed to decrypt vote ${vote.id}:`, e);
        }
      }
      
      // Add this authority's partial decryptions to the list
      const newPartialDecryptions = [
        ...partialDecryptions,
        {
          authorityId,
          votes: partialDecs
        }
      ];
      
      setPartialDecryptions(newPartialDecryptions);
      
      // Update authority status
      setAuthorities(prevAuths => 
        prevAuths.map(auth => 
          auth.id === authorityId ? { ...auth, hasSubmitted: true } : auth
        )
      );
      
      setSuccess(`Successfully submitted partial decryptions for authority #${authorityId}`);
      
    } catch (err) {
      console.error('Error submitting partial decryption:', err);
      setError('Failed to submit partial decryptions');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDecryptResults = async () => {
    try {
      setError('');
      setDecrypting(true);
      
      if (!cryptoConfig || partialDecryptions.length < threshold) {
        setError(`Need at least ${threshold} authorities to submit partial decryptions`);
        return;
      }
      
      const results = await decryptElectionResults({
        electionId,
        partialDecryptions
      });
      
      if (results.success) {
        setSuccess('Successfully decrypted election results!');
        if (onDecryptionComplete) {
          onDecryptionComplete(results);
        }
      } else {
        setError('Failed to decrypt results');
      }
      
    } catch (err) {
      console.error('Error decrypting results:', err);
      setError('Failed to decrypt election results');
    } finally {
      setDecrypting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading decryption components...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
      <div className="flex items-center mb-4">
        <KeySquare className="h-5 w-5 mr-2 text-amber-600" />
        <h3 className="text-lg font-semibold">Threshold Decryption</h3>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex items-start">
          <Check className="h-5 w-5 mr-2 mt-0.5" />
          <span>{success}</span>
        </div>
      )}
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          {threshold > 0
            ? `This election requires at least ${threshold} trusted authorities to collaborate in order to decrypt the results.`
            : 'Loading threshold information...'}
        </p>
        
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="text-blue-700 font-medium mb-1">Progress</div>
          <div className="flex items-center">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min(100, (partialDecryptions.length / threshold) * 100)}%` }}
              />
            </div>
            <span className="ml-2 text-sm font-medium">
              {partialDecryptions.length}/{threshold} authorities
            </span>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="text-md font-medium mb-3">Trusted Authorities</h4>
        <div className="space-y-3">
          {authorities.map(authority => (
            <div key={authority.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
              <div>
                <div className="font-medium">{authority.name}</div>
                <div className="text-sm text-gray-600">{authority.email}</div>
              </div>
              <div>
                {authority.hasSubmitted ? (
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-1" />
                    <span className="text-sm">Submitted</span>
                  </div>
                ) : authority.keyShareId ? (
                  <button
                    onClick={() => handleAuthorityDecryption(authority.id, authority.keyShareId!)}
                    disabled={loading}
                    className="flex items-center px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded"
                  >
                    <Unlock className="w-3.5 h-3.5 mr-1" />
                    Submit Decryption
                  </button>
                ) : (
                  <div className="flex items-center text-gray-500">
                    <Lock className="w-4 h-4 mr-1" />
                    <span className="text-sm">No key share</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {authorities.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              No trusted authorities found for this election
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleDecryptResults}
          disabled={decrypting || partialDecryptions.length < threshold}
          className={`flex items-center px-4 py-2 rounded ${
            partialDecryptions.length >= threshold
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {decrypting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Decrypting...
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4 mr-2" />
              Decrypt Election Results
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DecryptionPanel;
