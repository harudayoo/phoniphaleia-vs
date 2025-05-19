// Service for handling threshold ElGamal operations in the frontend
import { API_URL } from '@/config';
import { 
  encrypt, 
  createDecryptionShare,
  combineDecryptionShares
} from 'threshold-elgamal';

/**
 * Interface for ElGamal public key
 */
interface ElGamalPublicKey {
  g: string;
  h: string;
  p: string;
  q: string;
}

/**
 * Interface for ElGamal encrypted vote
 */
export interface ElGamalEncryptedVote {
  c1: string;
  c2: string;
}

/**
 * Interface for partial decryption
 */
export interface PartialDecryption {
  id: number;
  partialDecryption: string;
}

/**
 * Encrypt data using threshold ElGamal
 * 
 * @param publicKeyStr - The ElGamal public key as a JSON string
 * @param message - The message to encrypt (a number)
 * @returns The encrypted data as c1 and c2 strings
 */
export const encryptData = (publicKeyStr: string, message: number): ElGamalEncryptedVote => {
  try {
    const keyData = JSON.parse(publicKeyStr) as ElGamalPublicKey;
    
    // Get the group and create the params needed for encryption
    const g = BigInt(keyData.g);
    const h = BigInt(keyData.h);
    
    // Encrypt the message
    const result = encrypt({ g, h }, BigInt(message));
    
    return {
      c1: result.c1.toString(),
      c2: result.c2.toString()
    };
  } catch (error: unknown) {
    console.error('Error encrypting data with ElGamal:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error encrypting data: ${String(error)}`);
    }
  }
}

/**
 * Generate a partial decryption using a key share
 * 
 * @param publicKeyStr - The ElGamal public key as a JSON string
 * @param keyShareStr - The key share as a string
 * @param encryptedVote - The encrypted vote (c1, c2)
 * @returns The partial decryption
 */
export const generatePartialDecryption = (
  publicKeyStr: string, 
  keyShareStr: string, 
  encryptedVote: ElGamalEncryptedVote
): string => {
  try {
    // Parse the key share
    const keyShare = BigInt(keyShareStr);
    
    // Parse the encrypted vote
    const c1 = BigInt(encryptedVote.c1);
    
    // Generate the partial decryption
    const partialDecryption = createDecryptionShare(c1, keyShare);
    
    return partialDecryption.toString();
  } catch (error: unknown) {
    console.error('Error generating partial decryption:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error generating partial decryption: ${String(error)}`);
    }
  }
}

/**
 * Combine partial decryptions to reveal the original message
 * 
 * @param publicKeyStr - The ElGamal public key as a JSON string
 * @param encryptedVote - The encrypted vote (c1, c2)
 * @param partialDecryptions - Array of (id, partialDecryption) tuples
 * @returns The decrypted message as a number
 */
export const combinePartialDecryptions = (
  publicKeyStr: string,
  encryptedVote: ElGamalEncryptedVote,
  partialDecryptions: [number, string][]
): number => {
  try {
    // Parse the encrypted vote
    const c1 = BigInt(encryptedVote.c1);
    const c2 = BigInt(encryptedVote.c2);
    
    // Parse the partial decryptions - filter out any invalid entries
    const shares = partialDecryptions
      .filter(([, pd]) => pd && pd.length > 0)
      .map(([, pd]) => BigInt(pd));
    
    // Combine the partial decryptions
    const decryptedValue = combineDecryptionShares({ c1, c2 }, shares);
    
    // Convert from BigInt to number
    return Number(decryptedValue);
  } catch (error: unknown) {
    console.error('Error combining partial decryptions:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error combining partial decryptions: ${String(error)}`);
    }
  }
}

/**
 * Get the ElGamal public key for an election
 * 
 * @param electionId - The ID of the election
 * @returns The ElGamal public key
 */
export const getElGamalPublicKey = async (electionId: number): Promise<ElGamalPublicKey> => {
  try {
    const response = await fetch(`${API_URL}/crypto_configs/election/${electionId}?key_type=threshold_elgamal`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json() as { error?: string };
      throw new Error(errorData.error || 'Failed to get ElGamal public key');
    }

    const data = await response.json() as { public_key: string };
    return JSON.parse(data.public_key);
  } catch (error: unknown) {
    console.error('Error getting ElGamal public key:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error getting ElGamal public key: ${String(error)}`);
    }
  }
};

/**
 * Interface for key share response
 */
export interface KeyShareResponse {
  id: number;
  crypto_config_id: number;
  authority_id: number;
  key_share: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get key shares for an authority
 * 
 * @param cryptoConfigId - The ID of the crypto config
 * @param authorityId - The ID of the trusted authority
 * @returns The key share for the authority
 */
export const getKeyShare = async (cryptoConfigId: number, authorityId: number): Promise<KeyShareResponse> => {
  try {
    const response = await fetch(`${API_URL}/key_shares/crypto/${cryptoConfigId}/authority/${authorityId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json() as { error?: string };
      throw new Error(errorData.error || 'Failed to get key share');
    }

    return await response.json() as KeyShareResponse;
  } catch (error: unknown) {
    console.error('Error getting key share:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error getting key share: ${String(error)}`);
    }
  }
};

/**
 * Format the ElGamal public key for display
 * 
 * @param publicKeyString - JSON string representation of the public key
 * @returns A formatted string representation of the key
 */
export const formatElGamalPublicKey = (publicKeyString: string): string => {
  try {
    const keyObject = JSON.parse(publicKeyString) as { g: string; h: string };
    return `g: ${keyObject.g.substring(0, 10)}...${keyObject.g.substring(keyObject.g.length - 10)}
h: ${keyObject.h.substring(0, 10)}...${keyObject.h.substring(keyObject.h.length - 10)}`;
  } catch (error: unknown) {
    console.warn('Failed to parse ElGamal public key JSON:', error);
    return publicKeyString.substring(0, 20) + '...' + publicKeyString.substring(publicKeyString.length - 20);
  }
};
