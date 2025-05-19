// Type definitions for threshold-elgamal
declare module 'threshold-elgamal' {
  /**
   * Represents a structure with c1 and c2 values for ElGamal encryption
   */
  interface EncryptedMessage {
    c1: bigint;
    c2: bigint;
  }

  /**
   * Represents the group parameters for ElGamal
   */
  interface GroupParameters {
    prime: bigint;
    generator: bigint;
  }

  /**
   * Get the cryptographic group parameters
   * @param primeBits - The bit length of the prime (2048, 3072, or 4096)
   */
  export function getGroup(primeBits?: 2048 | 3072 | 4096): GroupParameters;

  /**
   * Encrypt a message using ElGamal
   * @param pubKey - The public key object containing g and h 
   * @param message - The message to encrypt
   */
  export function encrypt(
    pubKey: { g: bigint; h: bigint },
    message: bigint
  ): EncryptedMessage;

  /**
   * Create a partial decryption share
   * @param c1 - The c1 part of the encrypted message
   * @param keyShare - The private key share
   */
  export function createDecryptionShare(
    c1: bigint,
    keyShare: bigint
  ): bigint;

  /**
   * Combine partial decryptions to recover the original message
   * @param encryptedMessage - The encrypted message
   * @param shares - The decryption shares
   */
  export function combineDecryptionShares(
    encryptedMessage: { c1: bigint; c2: bigint },
    shares: bigint[]
  ): bigint;

  /**
   * Generate a key pair for threshold ElGamal
   * @param index - The participant index
   * @param threshold - The threshold number of participants
   * @param primeBits - The size of the prime
   */
  export function generateKeys(
    index: number, 
    threshold: number, 
    primeBits?: 2048 | 3072 | 4096
  ): { privateKey: bigint; publicKey: bigint };

  /**
   * Generate key shares for a threshold scheme
   * @param totalShares - The total number of shares
   * @param threshold - The minimum number needed for reconstruction
   * @param primeBits - The size of the prime
   */
  export function generateKeyShares(
    totalShares: number,
    threshold: number,
    primeBits?: 2048 | 3072 | 4096
  ): { masterKey: bigint; shares: Record<number, bigint>; publicKey: { g: bigint; h: bigint; p: bigint; q: bigint } };

  /**
   * Combine public keys
   * @param publicKeys - The public key shares
   * @param prime - The prime modulus
   */
  export function combinePublicKeys(
    publicKeys: { index: number; publicKey: bigint }[],
    prime: bigint
  ): bigint;

  /**
   * Threshold decrypt a message
   * @param encryptedMessage - The encrypted message
   * @param shares - The decryption shares
   * @param prime - The prime modulus
   */
  export function thresholdDecrypt(
    encryptedMessage: EncryptedMessage,
    shares: Record<number, bigint>,
    prime: bigint
  ): bigint;
}
