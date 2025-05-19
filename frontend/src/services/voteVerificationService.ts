// Vote Verification Service for ZKP and Paillier encryption
import { generateProof, verifyProof, ZKProof, CircuitInputs, VerificationKey } from './snarkjsService';
import { encryptData } from './elgamalService';

// Export interfaces to be used in other files
export interface VoteData {
  position_id: number;
  candidate_id: number;
}

export interface VoteZKProofInput {
  voterId: string;
  electionId: number;
  candidateIds: number[];
  positionIds: number[];
  nonce?: string; // Random nonce for added security
}

export interface VoteProofResult {
  proof: ZKProof;
  publicSignals: string[];
  isValid: boolean;
  vote: VoteData;
}

// Use the ZKProof interface from snarkjsService

export interface VerificationResult {
  isValid: boolean;
  proof?: ZKProof;
  publicSignals?: string[];
  error?: string;
}

// Generate ZK proof for vote validity using real circuit files
export const generateVoteProof = async (input: VoteZKProofInput): Promise<VerificationResult> => {
  try {
    console.log('Generating ZK proof with inputs:', input);
    // Only support one candidate/position per proof (matching circuit)
    const circuitInput: CircuitInputs = {
      voterId: parseInt(input.voterId.replace(/\D/g, '') || '0'),
      candidateId: input.candidateIds[0],
      positionId: input.positionIds[0],
      nonce: Date.now() + Math.floor(Math.random() * 1000000)
    };
    const { proof, publicSignals } = await generateProof(
      circuitInput,
      "/circuits/vote.wasm",
      "/circuits/vote.zkey"
    );
    return {
      isValid: true,
      proof,
      publicSignals
    };
  } catch (error) {
    console.error('Error generating proof:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// Verify ZK proof using the verification key
export const verifyVoteProof = async (
  proof: ZKProof,
  publicSignals: string[]
): Promise<boolean> => {
  try {
    console.log('Verifying ZK proof');
    console.log('Public signals:', publicSignals);
    console.log('Proof object:', proof);
    // Check for correct number of public signals
    if (!Array.isArray(publicSignals) || publicSignals.length !== 2) {
      throw new Error(`Expected 2 public signals, got ${publicSignals.length}: ${JSON.stringify(publicSignals)}`);
    }
    // Always use the static verification key file for now
    const response = await fetch("/circuits/verification_key.json");
    if (!response.ok) {
      throw new Error(`Failed to fetch verification key: ${response.status}`);
    }
    const vKey: VerificationKey = await response.json();
    const isValid = await verifyProof(vKey, publicSignals, proof);
    console.log('Proof verification result (static key):', isValid);
    return isValid;
  } catch (error: unknown) {
    console.error('Error verifying proof:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Interface for encrypted vote with metadata
 */
export interface EncryptedVoteData {
  c1: string;
  c2: string;
  metadata: {
    encryption_timestamp: number;
    encryption_scheme: string;
    public_key_id: string;
  };
}

// Encrypt votes using Paillier or ElGamal depending on key type
export const encryptVote = (voteValue: number, publicKey: string): string => {
  try {
    let encryptedData: any;
    // Try to parse the public key as JSON (Paillier format)
    let keyObj: any = null;
    try {
      keyObj = JSON.parse(publicKey);
    } catch (e) {
      // Not JSON, fallback to ElGamal
    }
    if (keyObj && keyObj.key_type === 'paillier' && keyObj.n) {
      // Paillier encryption (client-side, demo only; real use should be server-side)
      // For now, just store the plaintext or a placeholder, as Paillier is not implemented in JS here
      encryptedData = {
        ciphertext: voteValue.toString(), // Placeholder: store plaintext or use a real Paillier JS lib
        scheme: 'paillier',
        n: keyObj.n
      };
    } else {
      // Fallback: ElGamal encryption
      const encryptedVote = encryptData(publicKey, voteValue);
      encryptedData = {
        c1: encryptedVote.c1,
        c2: encryptedVote.c2,
        metadata: {
          encryption_timestamp: Date.now(),
          encryption_scheme: "elgamal",
          public_key_id: publicKey.slice(0, 16)
        }
      };
    }
    return JSON.stringify(encryptedData);
  } catch (error: unknown) {
    console.error('Error encrypting vote:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Function to check if the votes follow election rules
 * (e.g., one vote per position)
 * 
 * @param votes - Array of votes to validate
 * @returns true if the votes follow rules (no duplicates), false otherwise
 */
export const validateVoteRules = (votes: VoteData[]): boolean => {
  // Check if there are any votes to validate
  if (!votes || votes.length === 0) {
    return true; // Empty vote set is valid
  }
  
  const positionIds = votes.map(v => v.position_id);
  const uniquePositionIds = new Set(positionIds);
  
  // If there are duplicates, the lengths will be different
  return positionIds.length === uniquePositionIds.size;
};
