// Paillier encryption service using paillier-bigint
import { PublicKey } from 'paillier-bigint';

export function encryptPaillierVote(publicKeyJson: string, voteValue: number | string | bigint): string {  // Parse the public key JSON (should contain 'n' and optionally 'g')
  const pub = JSON.parse(publicKeyJson);
  const n = BigInt(pub.n);
  // Use g = n + 1 if not provided (standard Paillier)
  const g = pub.g ? BigInt(pub.g) : n + BigInt(1);
  const publicKey = new PublicKey(n, g);
  // Encrypt the vote
  const ciphertext = publicKey.encrypt(BigInt(voteValue));
  return ciphertext.toString();
}

// Optionally, add a function to pretty-format the ciphertext for storage/transmission
export function formatPaillierCiphertext(ciphertext: string): string {
  return ciphertext;
}
