import { API_URL } from '@/config';

/**
 * Interface for crypto configs from the backend
 */
export interface CryptoConfig {
  config_id: number;
  election_id: number;
  public_key: string;
  private_key?: string; // Only accessible to trusted authorities
  key_type: string;
  created_at: string;
  updated_at: string;  status: string;
  meta_data?: string; // JSON string with additional metadata
}

/**
 * Parsed metadata for crypto config
 */
export interface CryptoConfigMetadata {
  algorithm?: string;
  curve?: string;
  keySize?: number;
  threshold?: number;
  totalShares?: number;
  generatedAt?: string;
  protocolVersion?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Interface for Paillier key structure
 */
interface PaillierKeyObject {
  n: string;
  g?: string;
}

/**
 * Interface for ElGamal key structure
 */
interface ElGamalKeyObject {
  g: string;
  h: string;
  p?: string;
}

/**
 * Interface for verification key structure
 */
interface VerificationKeyObject {
  protocol?: string;
  curve?: string;
  [key: string]: unknown;
}

/**
 * Format Paillier public key for display
 * @param publicKeyString - JSON string of the Paillier public key
 * @returns Formatted string representation
 */
export const formatPaillierPublicKey = (publicKeyString: string): string => {
  try {
    const keyObject = JSON.parse(publicKeyString) as PaillierKeyObject;
    if (typeof keyObject.n !== 'string') {
      throw new Error('Invalid Paillier key format');
    }
    return `n: ${keyObject.n.substring(0, 20)}...${keyObject.n.substring(keyObject.n.length - 20)}`;
  } catch (error: unknown) {
    console.warn('Failed to parse public key JSON:', error);
    return publicKeyString.substring(0, 20) + '...' + publicKeyString.substring(publicKeyString.length - 20);
  }
};

/**
 * Format ElGamal public key for display
 * @param publicKeyString - JSON string of the ElGamal public key
 * @returns Formatted string representation
 */
export const formatElGamalPublicKey = (publicKeyString: string): string => {
  try {
    const keyObject = JSON.parse(publicKeyString) as ElGamalKeyObject;
    if (typeof keyObject.g !== 'string' || typeof keyObject.h !== 'string') {
      throw new Error('Invalid ElGamal key format');
    }
    return `g: ${keyObject.g.substring(0, 10)}...${keyObject.g.substring(keyObject.g.length - 10)},
h: ${keyObject.h.substring(0, 10)}...${keyObject.h.substring(keyObject.h.length - 10)}`;
  } catch (error: unknown) {
    console.warn('Failed to parse ElGamal public key JSON:', error);
    return publicKeyString.substring(0, 20) + '...' + publicKeyString.substring(publicKeyString.length - 20);
  }
};

/**
 * Format verification key for display
 * @param publicKeyString - JSON string of the verification key
 * @returns Formatted string representation
 */
export const formatVerificationKey = (publicKeyString: string): string => {
  try {
    const keyObject = JSON.parse(publicKeyString) as VerificationKeyObject;
    return `ZKP Verification Key (${keyObject.protocol || 'snarkjs'})`;
  } catch (error: unknown) {
    console.warn('Failed to parse verification key JSON:', error);
    return 'ZKP Verification Key';
  }
};

/**
 * Known crypto key types
 */
export enum CryptoKeyType {
  PAILLIER = 'paillier',
  THRESHOLD_ELGAMAL = 'threshold_elgamal',
  VERIFICATION_KEY = 'verification_key',
  RSA = 'rsa',
  ECDSA = 'ecdsa',
}

/**
 * Format public key based on key type
 * @param publicKeyString - JSON string of the public key
 * @param keyType - Type of cryptographic key
 * @returns Formatted string representation
 */
export const formatPublicKey = (publicKeyString: string, keyType: string): string => {
  if (!publicKeyString) {
    return 'Invalid key data';
  }
  
  switch (keyType) {
    case CryptoKeyType.PAILLIER:
      return formatPaillierPublicKey(publicKeyString);
    case CryptoKeyType.THRESHOLD_ELGAMAL:
      return formatElGamalPublicKey(publicKeyString);
    case CryptoKeyType.VERIFICATION_KEY:
      return formatVerificationKey(publicKeyString);
    default:
      // Safe truncation for unknown key types
      return publicKeyString.length > 40 
        ? `${publicKeyString.substring(0, 20)}...${publicKeyString.substring(publicKeyString.length - 20)}`
        : publicKeyString;
  }
};

/**
 * Error response from the API
 */
interface ErrorResponse {
  error: string;
  message?: string;
  status?: number;
}

/**
 * Function to get crypto config for an election
 * @param electionId - ID of the election to get crypto config for
 * @param keyType - Optional key type to filter by
 * @returns The crypto configuration
 */
export const getCryptoConfig = async (electionId: number, keyType?: string): Promise<CryptoConfig> => {
  try {
    let url = `${API_URL}/crypto_configs/election/${electionId}`;
    
    if (keyType) {
      url += `?key_type=${keyType}`;
    }
    
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json() as ErrorResponse;
      throw new Error(errorData.error || `Failed to fetch crypto configuration: ${response.status}`);
    }
    
    return await response.json() as CryptoConfig;
  } catch (error: unknown) {
    console.error('Error fetching crypto config:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error fetching crypto config: ${String(error)}`);
    }
  }
};

/**
 * Function to get all crypto configs for an election
 * @param electionId - ID of the election to get all crypto configs for
 * @returns Array of crypto configurations
 */
export const getAllCryptoConfigs = async (electionId: number): Promise<CryptoConfig[]> => {
  try {
    const response = await fetch(`${API_URL}/crypto_configs/election/${electionId}/all`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json() as ErrorResponse;
      throw new Error(errorData.error || `Failed to fetch crypto configurations: ${response.status}`);
    }
    
    return await response.json() as CryptoConfig[];
  } catch (error: unknown) {
    console.error('Error fetching all crypto configs:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error fetching crypto configurations: ${String(error)}`);
    }
  }
};
