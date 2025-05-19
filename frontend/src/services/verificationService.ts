// Service for handling zero-knowledge proofs and vote decryption
import { API_URL } from '@/config';

/**
 * Interface for ZKP verification request
 */
interface VerifyZKPRequest {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
  electionId: number;
}

/**
 * Interface for vote decryption request
 */
interface DecryptVoteRequest {
  encryptedVote: {
    c1: string;
    c2: string;
  };
  electionId: number;
  partialDecryptions: {
    id: number;
    partialDecryption: string;
  }[];
}

/**
 * Interface for partial decryption submission
 */
interface SubmitPartialDecryptionRequest {
  encryptedVote: {
    c1: string;
    c2: string;
  };
  electionId: number;
  authorityId: number;
  keyShareId: number;
  
  // Challenge-response authentication fields
  challenge?: string;
  response?: string;
  publicKeyFingerprint?: string;
}

/**
 * Interface for decrypting all election results
 */
interface DecryptElectionResultsRequest {
  electionId: number;
  partialDecryptions: {
    authorityId: number;
    votes: {
      [voteId: string]: {
        id: number;
        partialDecryption: string;
      }
    }
  }[];
}

/**
 * Response from the verification API
 */
interface VerifyZKPResponse {
  valid: boolean;
  message?: string;
}

/**
 * Verify a vote using zero-knowledge proof
 * 
 * @param data - Verification request data
 * @returns True if the proof is valid
 */
export const verifyVoteZKP = async (data: VerifyZKPRequest): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/verification/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json() as { error: string };
      throw new Error(errorData.error || 'Failed to verify vote');
    }

    const result = await response.json() as VerifyZKPResponse;
    return result.valid;
  } catch (error: unknown) {
    console.error('Error verifying vote ZKP:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error verifying vote ZKP: ${String(error)}`);
    }
  }
};

/**
 * Interface for decryption response
 */
interface DecryptVoteResponse {
  decryptedVote: number;
  success: boolean;
  message?: string;
}

/**
 * Decrypt a vote using threshold cryptography
 * 
 * @param data - Decryption request data
 * @returns The decrypted vote value
 */
export const decryptVote = async (data: DecryptVoteRequest): Promise<number> => {
  try {
    const response = await fetch(`${API_URL}/verification/decrypt/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json() as { error: string };
      throw new Error(errorData.error || 'Failed to decrypt vote');
    }

    const result = await response.json() as DecryptVoteResponse;
    return result.decryptedVote;
  } catch (error: unknown) {
    console.error('Error decrypting vote:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error decrypting vote: ${String(error)}`);
    }
  }
};

/**
 * Interface for partial decryption response
 */
interface PartialDecryptionResponse {
  id: number;
  partialDecryption: string;
  authorityId?: number;
  timestamp?: string;
}

/**
 * Interface for authority credentials
 */
export interface AuthCredentials {
  challenge: string;
  response: string;
  publicKeyFingerprint: string;
}

/**
 * Submit a partial decryption for a vote
 * 
 * @param data - Partial decryption submission data
 * @param authCredentials - Optional trusted authority credentials for authentication
 * @returns The partial decryption result
 */
export const submitPartialDecryption = async (
  data: SubmitPartialDecryptionRequest, 
  authCredentials?: AuthCredentials
): Promise<PartialDecryptionResponse> => {
  try {
    // Include authentication data if provided
    if (authCredentials) {
      data.challenge = authCredentials.challenge;
      data.response = authCredentials.response;
      data.publicKeyFingerprint = authCredentials.publicKeyFingerprint;
    }
    const response = await fetch(`${API_URL}/verification/decrypt/submit-partial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json() as { error: string };
      throw new Error(errorData.error || 'Failed to submit partial decryption');
    }

    return await response.json() as PartialDecryptionResponse;
  } catch (error: unknown) {
    console.error('Error submitting partial decryption:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error submitting partial decryption: ${String(error)}`);
    }
  }
};

/**
 * Interface for election result position
 */
export interface ElectionResultPosition {
  position_id: number;
  position_name?: string;
  candidate_results: Record<string, number>;
  total_votes?: number;
}

/**
 * Interface for election results response
 */
export interface ElectionResultsResponse {
  success: boolean;
  results: ElectionResultPosition[];
  election_id?: number;
  timestamp?: string;
  message?: string;
}

/**
 * Decrypt all votes for an election and compute results
 * 
 * @param data - Election results decryption data
 * @returns The decrypted election results
 */
export const decryptElectionResults = async (data: DecryptElectionResultsRequest): Promise<ElectionResultsResponse> => {
  try {
    const response = await fetch(`${API_URL}/verification/decrypt/election-results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json() as { error: string };
      throw new Error(errorData.error || 'Failed to decrypt election results');
    }

    return await response.json() as ElectionResultsResponse;
  } catch (error: unknown) {
    console.error('Error decrypting election results:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error decrypting election results: ${String(error)}`);
    }
  }
};
