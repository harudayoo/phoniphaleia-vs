// frontend/src/services/zkpservice.ts
import { ec as EC } from 'elliptic';
import crypto from 'crypto';

// Create a new elliptic curve instance
const ec = new EC('secp256k1');

export interface ZKPProof {
  R: string;
  s: string;
}

export interface ZKPLoginResponse {
  studentId: string;
  proof: ZKPProof;
}

export class ZKPService {
  /**
   * Creates a hash of the user credentials
   * @param studentId - Student ID to use as salt
   * @param password - Password to hash
   * @returns Hex string of the hashed credentials
   */
  static hashCredentials(studentId: string, password: string): string {
    return crypto
      .pbkdf2Sync(password, studentId, 100000, 32, 'sha256')
      .toString('hex');
  }

  /**
   * Generates a public commitment (public key) from private credentials
   * @param studentId - Student ID to use as salt
   * @param password - Password to derive key from
   * @returns Hex string representation of the public key
   */
  static generateCommitment(studentId: string, password: string): string {
    try {
      const secret = crypto.pbkdf2Sync(password, studentId, 100000, 32, 'sha256');
      const keyPair = ec.keyFromPrivate(secret);
      return keyPair.getPublic().encode('hex', true);
    } catch (error: unknown) {
      console.error('Error generating commitment:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Error generating cryptographic commitment: ${String(error)}`);
      }
    }
  }

  /**
   * Generates a proof for authentication without revealing the password
   * @param studentId - Student ID for the authentication
   * @param challenge - Server-provided challenge string
   * @param password - Password for authentication (never sent to server)
   * @returns ZKP login response containing proof
   */
  static generateLoginProof(
    studentId: string,
    challenge: string,
    password: string,
  ): ZKPLoginResponse {
    try {
      // Create secret from credentials
      const secret = crypto.pbkdf2Sync(password, studentId, 100000, 32, 'sha256');
      const keyPair = ec.keyFromPrivate(secret);
      
      // Generate random value for proof
      const k = ec.genKeyPair().getPrivate();
      const R = ec.g.mul(k);
      
      // Hash the challenge with the random point
      const eHex = crypto
        .createHash('sha256')
        .update(R.encode('hex', true) + challenge)
        .digest('hex');
      
      // Create proof components
      const e = ec.keyFromPrivate(eHex, 'hex').getPrivate();
      const s = k.add(keyPair.getPrivate().mul(e));
      
      return {
        studentId,
        proof: {
          R: R.encode('hex', true),
          s: s.toString(16)
        }
      };
    } catch (error: unknown) {
      console.error('Error generating login proof:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Error generating login proof: ${String(error)}`);
      }
    }
  }
    /**
   * Validates a student ID format
   * @param studentId - Student ID to validate
   * @returns True if the student ID matches the required pattern
   */
  static validateStudentId(studentId: string): boolean {
    const pattern = /^[0-9]{4}-[0-9]{5}$/;
    return pattern.test(studentId);
  }

  /**
   * Validates the ZKP proof structure
   * @param proof - The ZKP proof to validate
   * @returns True if the proof has valid structure
   */
  static validateProofStructure(proof: unknown): proof is ZKPProof {
    if (!proof || typeof proof !== 'object') return false;
    
    const typedProof = proof as Record<string, unknown>;
    return (
      typeof typedProof.R === 'string' &&
      typeof typedProof.s === 'string' &&
      typedProof.R.length > 0 &&
      typedProof.s.length > 0
    );
  }
}