import React, { useState, useEffect } from 'react';
import { KeySquare, Unlock, Shield, AlertCircle } from 'lucide-react';
import { submitPartialDecryption } from '@/services/verificationService';
import { authorityAuthService, TrustedAuthorityCredentials } from '@/services/authorityAuthService';
import { CHALLENGE_EXPIRY_SECONDS } from '@/services/authConfig';

interface AuthorityDecryptionPanelProps {
  electionId: number;
  authorityId: number;
  keyShareId: number;
  encryptedVotes: Array<{
    id: number;
    encryptedData: {
      c1: string;
      c2: string;
    }
  }>;
  onDecryptionComplete?: (results: {
    authorityId: number;
    votes: Record<number, { id: number; partialDecryption: string }>;
  }) => void;
}

const AuthorityDecryptionPanel: React.FC<AuthorityDecryptionPanelProps> = ({
  electionId,
  authorityId,
  keyShareId,
  encryptedVotes,
  onDecryptionComplete
}) => {
  // State for authority credentials
  const [credentials, setCredentials] = useState<TrustedAuthorityCredentials | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [publicKeyFingerprint, setPublicKeyFingerprint] = useState('');
  
  // State for processing
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [decryptionError, setDecryptionError] = useState('');
  const [success, setSuccess] = useState('');
  const [partialDecryptions, setPartialDecryptions] = useState<{[voteId: number]: { id: number; partialDecryption: string }}>({});;
  const [progress, setProgress] = useState(0);
  const [challengeExpiry, setChallengeExpiry] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Effect for countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (challengeExpiry) {
      timer = setInterval(() => {
        const now = new Date();
        const diff = Math.max(0, Math.floor((challengeExpiry.getTime() - now.getTime()) / 1000));
        setTimeLeft(diff);
        
        if (diff === 0) {
          setIsAuthenticated(false);
          setChallengeExpiry(null);
          clearInterval(timer);
        }
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [challengeExpiry]);

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    
    try {
      // Create authority credentials
      const newCredentials: TrustedAuthorityCredentials = {
        authorityId,
        privateKey,
        publicKeyFingerprint
      };
      
      // Authenticate with server
      const authenticated = await authorityAuthService.authenticate(newCredentials);
      
      if (authenticated) {
        setCredentials(newCredentials);
        setIsAuthenticated(true);
        
        // Set expiry timer
        const expiry = new Date();
        expiry.setSeconds(expiry.getSeconds() + CHALLENGE_EXPIRY_SECONDS);
        setChallengeExpiry(expiry);
        
        setSuccess('Authentication successful. You can now submit partial decryptions.');
      } else {
        setAuthError('Authentication failed. Please check your credentials.');
      }
    } catch (error) {
      setAuthError(`Authentication error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDecryption = async () => {
    if (!credentials || !isAuthenticated) {
      setDecryptionError('You must authenticate first.');
      return;
    }
    
    setLoading(true);
    setDecryptionError('');
    setSuccess('');
    
    try {
      // Get a new challenge for this operation
      const challengeData = await authorityAuthService.requestChallenge(authorityId);
      
      // Generate a signed response
      const responseData = await authorityAuthService.generateChallengeResponse(
        challengeData.challenge, 
        credentials.privateKey
      );
        // Process each vote
      let completed = 0;
      const results: {[voteId: number]: { id: number; partialDecryption: string }} = {};
      
      for (const vote of encryptedVotes) {
        try {
          // Prepare request data
          const requestData = {
            encryptedVote: vote.encryptedData,
            electionId,
            authorityId,
            keyShareId
          };
          
          // Submit partial decryption with authentication
          const result = await submitPartialDecryption(
            requestData,
            {
              challenge: challengeData.challenge,
              response: JSON.stringify(responseData),
              publicKeyFingerprint: credentials.publicKeyFingerprint
            }
          );
          
          results[vote.id] = result;
          completed++;
          setProgress(Math.floor((completed / encryptedVotes.length) * 100));
        } catch (error) {
          console.error(`Error decrypting vote ${vote.id}:`, error);
        }
      }
      
      setPartialDecryptions(results);
      setSuccess(`Successfully processed ${completed} of ${encryptedVotes.length} votes.`);
      
      // Call completion handler
      if (onDecryptionComplete) {
        onDecryptionComplete({
          authorityId,
          votes: results
        });
      }
    } catch (error) {
      setDecryptionError(`Decryption error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeLeft = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center mb-4">
        <KeySquare className="mr-2 text-primary" />
        <h2 className="text-xl font-semibold">Trusted Authority Decryption Panel</h2>
      </div>
      
      {!isAuthenticated ? (
        <div className="mb-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <div className="flex">
              <Shield className="text-blue-500" />
              <p className="ml-3 text-blue-700">
                Authentication required. Please enter your private key and public key fingerprint.
              </p>
            </div>
          </div>
          
          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div>
              <label htmlFor="publicKeyFingerprint" className="block text-sm font-medium text-gray-700">
                Public Key Fingerprint
              </label>
              <input
                type="text"
                id="publicKeyFingerprint"
                value={publicKeyFingerprint}
                onChange={(e) => setPublicKeyFingerprint(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                required
              />
            </div>
            
            <div>
              <label htmlFor="privateKey" className="block text-sm font-medium text-gray-700">
                Private Key (never shared with server)
              </label>
              <textarea
                id="privateKey"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Your private key is only used locally to sign the authentication challenge and is never sent to the server.
              </p>
            </div>
            
            {authError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <AlertCircle className="text-red-500" />
                  <p className="ml-3 text-red-700">{authError}</p>
                </div>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Authenticate'}
            </button>
          </form>
        </div>
      ) : (
        <div className="mb-6">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
            <div className="flex items-center">
              <Unlock className="text-green-500" />
              <div className="ml-3">
                <p className="text-green-700">
                  Successfully authenticated as Authority ID: {authorityId}
                </p>
                <p className="text-sm text-green-600">
                  Session expires in: {formatTimeLeft(timeLeft)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium text-gray-700">Decryption Status</h3>
            <div className="mt-2 h-2 w-full bg-gray-200 rounded-full">
              <div 
                className="h-full bg-primary rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {progress}% complete ({Object.keys(partialDecryptions).length} of {encryptedVotes.length} votes)
            </p>
          </div>
          
          {decryptionError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <AlertCircle className="text-red-500" />
                <p className="ml-3 text-red-700">{decryptionError}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <p className="text-green-700">{success}</p>
            </div>
          )}
          
          <button
            onClick={handleSubmitDecryption}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Submit Partial Decryptions'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthorityDecryptionPanel;
