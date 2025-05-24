// Vote Verification Service for ZKP and Paillier encryption
import { generateProof, verifyProof, ZKProof, CircuitInputs } from './snarkjsService';
// Remove ElGamal import
// import { encryptData } from './elgamalService';

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

// Verify ZK proof for vote validity
export const verifyVoteProof = async (proof: ZKProof, publicSignals: string[]): Promise<boolean> => {
  try {
    console.log('Verifying ZK proof');
    console.log('Public signals:', publicSignals);
    console.log('Proof object:', proof);
    // Check for correct number of public signals
    if (!Array.isArray(publicSignals) || publicSignals.length !== 2) {
      throw new Error(`Expected 2 public signals, got ${publicSignals.length}: ${JSON.stringify(publicSignals)}`);
    }
    // First fetch the verification key from the path
    const vkeyResponse = await fetch("/circuits/verification_key.json");
    if (!vkeyResponse.ok) {
      throw new Error(`Failed to fetch verification key: ${vkeyResponse.status}`);
    }
    let verificationKey;
    try {
      verificationKey = await vkeyResponse.json();
      console.log('Verification key loaded successfully');
    } catch (jsonError) {
      console.error('JSON parse error with verification key:', jsonError);
      throw new Error(`Failed to parse verification key: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
    }    // Validate the verification key structure
    if (!verificationKey || !verificationKey.protocol || !verificationKey.curve || !verificationKey.nPublic) {
      console.error('Invalid verification key structure:', verificationKey);
      throw new Error('Verification key has invalid structure');
    }

    // Then verify using the key object
    console.log('Verifying proof with key, signals, and proof');
    const isValid = await verifyProof(
      verificationKey,
      publicSignals,
      proof
    );
    console.log('Proof verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Error verifying proof:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Encrypt a vote using Paillier homomorphic encryption
 */
export const encryptVote = (voteValue: number | string, publicKeyStr: string): string => {
  try {
    // Ensure vote is a number
    const vote = typeof voteValue === 'string' ? parseInt(voteValue, 10) : voteValue;
    
    // First try to parse the key as Paillier
    try {
      const keyObj = JSON.parse(publicKeyStr);
      
      // If we have an 'n' value, it's a Paillier key
      if (keyObj.n) {
        console.log('Using Paillier encryption');
        // Create a BigInt from the n value for Paillier encryption
        const n = BigInt(keyObj.n);
        
        // Simple modular exponentiation for Paillier encryption: (vote + 1)^n mod n^2
        // Note: In production, use a proper Paillier library with randomization
        const g = BigInt(keyObj.g || (n + BigInt(1)));  // g is often n+1 in Paillier
        
        // Calculate n^2
        const nSquared = n * n;
        
        // Convert vote to BigInt and encrypt: g^m * r^n mod n^2 
        // For simplicity, we're using r=1 which isn't secure in production
        const m = BigInt(vote);
        
        // Calculate g^m mod n^2
        const gPowM = modPow(g, m, nSquared);
        
        // Result is just g^m (no randomization - for production use a proper library)
        const encryptedVote = gPowM.toString();
        
        return encryptedVote;
      }
    } catch (e) {
      console.error('Error parsing key or encrypting with Paillier:', e);
    }
    
    // Input validation
    if (typeof vote !== 'number') {
      throw new Error('Vote must be a number');
    }
    
    // We only support Paillier now
    throw new Error('Only Paillier encryption is supported');
  } catch (error) {
    console.error('Error encrypting vote:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Simple modular exponentiation helper function (base^exponent mod modulus)
 * Note: This is a simple implementation for demonstration
 * In production, use a cryptographically secure library
 */
function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus === BigInt(1)) return BigInt(0);
  
  let result = BigInt(1);
  base = base % modulus;
  
  while (exponent > BigInt(0)) {
    if (exponent % BigInt(2) === BigInt(1)) {
      result = (result * base) % modulus;
    }
    exponent = exponent >> BigInt(1);
    base = (base * base) % modulus;
  }
  
  return result;
}

// Function to create encrypted ballot that contains ZK proof and encrypted vote
export const createEncryptedBallot = async (
  input: VoteZKProofInput,
  publicKey: string
): Promise<unknown> => {
  try {
    // Generate ZK proof first
    const proofResult = await generateVoteProof(input);
    
    if (!proofResult.isValid || !proofResult.proof || !proofResult.publicSignals) {
      throw new Error('Failed to generate valid proof');
    }
    
    // Encrypt votes using only Paillier
    const encryptedVotes = input.candidateIds.map((candidateId, index) => {
      return {
        position_id: input.positionIds[index],
        candidate_id: candidateId,
        encrypted_vote: encryptVote(candidateId, publicKey)
      };
    });
    
    // Construct ballot with proof and encrypted votes
    return {
      voter_id: input.voterId,
      election_id: input.electionId,
      votes: encryptedVotes,
      proof: {
        zkp: proofResult.proof,
        public_signals: proofResult.publicSignals
      },
      metadata: {
        timestamp: new Date().toISOString(),
        nonce: input.nonce || Date.now().toString(),
        encryption_scheme: "paillier",
        client_version: "2.0.0"
      }
    };
  } catch (error) {
    console.error('Error creating encrypted ballot:', error);
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
