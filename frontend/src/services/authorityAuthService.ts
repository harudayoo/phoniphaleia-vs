/**
 * Service for trusted authority authentication using challenge-response
 */
import apiClient from '@/utils/apiClient';
import { signChallenge } from '@/utils/cryptoUtils';

export interface Challenge {
  challenge: string;
  expiresIn: number;
}

export interface ChallengeResponse {
  signature: string;
  timestamp: string;
}

export interface TrustedAuthorityCredentials {
  authorityId: number;
  privateKey: string;
  publicKeyFingerprint: string;
}

class AuthorityAuthService {  /**
   * Request a challenge from the server for authentication
   * @param authorityId The ID of the trusted authority
   * @returns The challenge and expiration time
   */
  async requestChallenge(authorityId: number): Promise<Challenge> {
    try {
      const response = await apiClient.post<Challenge>('/trusted_authorities/challenge', { authorityId });
      return response.data;
    } catch (error: unknown) {
      console.error('Failed to request challenge:', error);
      throw new Error('Failed to request authentication challenge');
    }
  }
  /**
   * Verify a trusted authority using challenge-response
   * @param credentials The trusted authority credentials
   * @param challenge The challenge received from the server
   * @param response The signed challenge response
   * @returns Whether verification was successful
   */
  async verifyAuthority(
    credentials: TrustedAuthorityCredentials,
    challenge: string,
    response: ChallengeResponse
  ): Promise<boolean> {
    try {
      const verificationPayload = {
        authorityId: credentials.authorityId,
        challenge,
        response: JSON.stringify(response),
        publicKeyFingerprint: credentials.publicKeyFingerprint,
      };
      
      interface VerificationResponse {
        valid: boolean;
        message?: string;
      }
      
      const resp = await apiClient.post<VerificationResponse>(
        '/verification/verify-authority', 
        verificationPayload
      );
      
      return resp.data.valid === true;
    } catch (error: unknown) {
      console.error('Authority verification failed:', error);
      return false;
    }
  }
  /**
   * Generate a signed response to a challenge
   * @param challenge The challenge to sign
   * @param privateKey The private key to sign with
   * @returns The signed challenge response
   */
  async generateChallengeResponse(challenge: string, privateKey: string): Promise<ChallengeResponse> {
    try {
      const timestamp = new Date().toISOString();
      const dataToSign = `${challenge}:${timestamp}`;
      
      const signature = await signChallenge(dataToSign, privateKey);
      
      return {
        signature,
        timestamp
      };
    } catch (error: unknown) {
      console.error('Failed to generate challenge response:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Failed to generate authentication response: ${String(error)}`);
      }
    }
  }

  /**
     /**
   * Perform the complete challenge-response authentication flow
   * @param credentials The trusted authority credentials
   * @returns Whether authentication was successful
   */
  async authenticate(credentials: TrustedAuthorityCredentials): Promise<boolean> {
    try {
      // 1. Request a challenge
      const challengeData = await this.requestChallenge(credentials.authorityId);
      
      // 2. Generate a signed response
      const response = await this.generateChallengeResponse(
        challengeData.challenge,
        credentials.privateKey
      );
      
      // 3. Verify the authentication
      return await this.verifyAuthority(
        credentials,
        challengeData.challenge,
        response
      );
    } catch (error: unknown) {
      console.error('Authentication flow failed:', error);
      return false;
    }
  }
}

export const authorityAuthService = new AuthorityAuthService();
export default authorityAuthService;
