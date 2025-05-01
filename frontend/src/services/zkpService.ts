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
   */
  static hashCredentials(studentId: string, password: string): string {
    return crypto
      .pbkdf2Sync(password, studentId, 100000, 32, 'sha256')
      .toString('hex');
  }

  /**
   * Generates a public commitment (public key) from private credentials
   */
  static generateCommitment(studentId: string, password: string): string {
    const secret = crypto.pbkdf2Sync(password, studentId, 100000, 32, 'sha256');
    const keyPair = ec.keyFromPrivate(secret);
    return keyPair.getPublic().encode('hex', true);
  }

  /**
   * Generates a proof for authentication without revealing the password
   */
  static generateLoginProof(
    studentId: string,
    challenge: string,
    password: string, // Added password parameter
  ): ZKPLoginResponse {
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
  }
  
  /**
   * Validates a student ID format
   */
  static validateStudentId(studentId: string): boolean {
    const pattern = /^[0-9]{4}-[0-9]{5}$/;
    return pattern.test(studentId);
  }
}