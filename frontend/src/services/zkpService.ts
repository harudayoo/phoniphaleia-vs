// frontend/src/services/zkpservice.ts
import { ec as EC } from 'elliptic';
import crypto from 'crypto';

const ec = new EC('secp256k1');

interface ZKPProof {
  R: string;
  s: string;
}

interface ZKPLoginResponse {
  studentId: string;
  proof: ZKPProof;
}

export class ZKPService {
  private static getKeyPair(studentId: string): EC.KeyPair {
    const privateKeyHex = localStorage.getItem(`zkp:${studentId}`);
    if (!privateKeyHex) {
      throw new Error('No ZKP key found for this student ID');
    }
    return ec.keyFromPrivate(privateKeyHex, 'hex');
  }

  static generateCredentials(studentId: string, password: string): {
    commitment: string;
    secret: string;
  } {
    // Generate key pair
    const keyPair = ec.genKeyPair();
    const privateKeyHex = keyPair.getPrivate().toString('hex');
    
    // Store private key securely
    if (typeof window !== 'undefined') {
      localStorage.setItem(`zkp:${studentId}`, privateKeyHex);
    }
    
    // Generate commitment (public key)
    const commitment = keyPair.getPublic().encode('hex', true);
    
    // Generate secret (hash of credentials)
    const secret = crypto
      .createHash('sha256')
      .update(`${studentId}:${password}`)
      .digest('hex');
    
    return { commitment, secret };
  }

  static generateLoginProof(
    studentId: string,
    challenge: string
  ): ZKPLoginResponse {
    const keyPair = this.getKeyPair(studentId);
    const k = ec.genKeyPair().getPrivate();
    const R = ec.g.mul(k);
    
    // Compute challenge hash
    const eHex = crypto
      .createHash('sha256')
      .update(R.encode('hex', true) + challenge)
      .digest('hex');
    
    // Convert hex to BN (Big Number)
    const e = new EC('secp256k1').keyFromPrivate(eHex, 'hex').getPrivate();
    
    // Compute response
    const s = k.add(keyPair.getPrivate().mul(e));
    
    return {
      studentId,
      proof: {
        R: R.encode('hex', true),
        s: s.toString(16)
      }
    };
  }

  static validateStudentId(studentId: string): boolean {
    const pattern = /^[0-9]{4}-[0-9]{5}$/;
    return pattern.test(studentId);
  }

  // These are the methods that register.tsx expects
  static hashCredentials(studentId: string, password: string): string {
    return crypto
      .createHash('sha256')
      .update(`${studentId}:${password}`)
      .digest('hex');
  }

  static generateCommitment(studentId: string, password: string): string {
    const keyPair = ec.genKeyPair();
    const privateKeyHex = keyPair.getPrivate().toString('hex');
    
    // Store both studentId and password in localStorage for later proof generation
    if (typeof window !== 'undefined') {
        localStorage.setItem(`zkp:${studentId}`, JSON.stringify({
            privateKey: privateKeyHex,
            password: password // Store password if needed for proof generation
        }));
    }
    
    return keyPair.getPublic().encode('hex', true);
}
}