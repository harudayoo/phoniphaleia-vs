/**
 * Cryptographic utilities for frontend services
 */

/**
 * Generate a SHA-256 hash of a public key
 * @param publicKey The public key to hash
 * @returns The fingerprint of the public key
 */
export async function generatePublicKeyFingerprint(publicKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(publicKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Sign data with a private key
 * @param data The data to sign
 * @param privateKeyPem The PEM-encoded private key
 * @returns The signature as a hex string
 */
export async function signChallenge(data: string, privateKeyPem: string): Promise<string> {
  // In a real implementation, this would use the Web Crypto API
  // For demonstration purposes, we're mocking this functionality
  // since it requires proper handling of PEM keys and ASN.1 structures
  
  // This is a placeholder that simply returns a mock signature
  const encoder = new TextEncoder();
  const dataToSign = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataToSign);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const mockSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log('Mock signing of data:', data);
  console.log('Using private key (abbreviated):', privateKeyPem.substring(0, 20) + '...');
  
  return mockSignature;
}

/**
 * Verify a signature against data with a public key
 * @param data The original data
 * @param signature The signature to verify
 * @param publicKeyPem The PEM-encoded public key
 * @returns Whether the signature is valid
 */
export async function verifySignature(
  data: string, 
  signature: string, 
  publicKeyPem: string
): Promise<boolean> {
  // In a real implementation, this would use the Web Crypto API
  // For demonstration purposes, we're mocking this functionality
  
  console.log('Mock verifying signature for data:', data);
  console.log('Using public key (abbreviated):', publicKeyPem.substring(0, 20) + '...');
  
  // Always return true in this mock implementation
  return true;
}
