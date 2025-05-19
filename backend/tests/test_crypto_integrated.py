"""
Integrated test for the cryptographic components of the system
Tests the complete flow of key generation, encryption, and decryption
"""
import sys
import os
import json
import unittest
import random

# Add parent directory to path to import app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app.services.crypto.threshold_elgamal import ThresholdElGamalService
from app.services.crypto.shamir import split_secret, reconstruct_secret, next_prime, serialize_share, deserialize_share
from app.services.zkp.snarkjs_verifier import SnarkjsVerifier

class TestCryptoIntegrated(unittest.TestCase):
    """
    Integrated tests for the cryptographic components
    """
    def setUp(self):
        """
        Set up test environment
        """
        self.n_authorities = 5  # Number of trusted authorities
        self.threshold = 3      # Minimum required for decryption
        self.vote_values = [1, 2, 3, 42]  # Test vote values
    
    def test_threshold_elgamal_flow(self):
        """
        Test the complete flow of threshold ElGamal:
        1. Key generation
        2. Vote encryption
        3. Partial decryption generation
        4. Combining partial decryptions
        """
        print("\n=== Testing threshold ElGamal flow ===")
        
        # Step 1: Generate key pair
        print(f"Generating key pair for {self.n_authorities} authorities with threshold {self.threshold}...")
        key_data = ThresholdElGamalService.generate_key_pair(self.n_authorities, self.threshold)
        
        # Verify expected structure
        self.assertIn("public_key", key_data)
        self.assertIn("key_shares", key_data)
        self.assertEqual(len(key_data["key_shares"]), self.n_authorities)
        
        # Step 2: Serialize public key
        public_key_json = ThresholdElGamalService.serialize_public_key(key_data["public_key"])
        print(f"Public key: {public_key_json[:50]}...")
        
        # Step 3: Encrypt votes
        encrypted_votes = []
        for vote_value in self.vote_values:
            print(f"Encrypting vote: {vote_value}")
            encrypted_vote = ThresholdElGamalService.encrypt_vote(public_key_json, vote_value)
            encrypted_votes.append(encrypted_vote)
            print(f"Encrypted vote c1: {encrypted_vote['c1'][:20]}...")
            print(f"Encrypted vote c2: {encrypted_vote['c2'][:20]}...")
        
        # Step 4: Generate partial decryptions from a subset of authorities
        # Pick random subset of key shares (exactly threshold number)
        shares_subset = random.sample(key_data["key_shares"], self.threshold)
        print(f"Using {len(shares_subset)} authorities for decryption (threshold: {self.threshold})")
        
        # For each encrypted vote
        for i, encrypted_vote in enumerate(encrypted_votes):
            print(f"Decrypting vote #{i+1} (original value: {self.vote_values[i]})")
            partial_decryptions = []
            
            # Each authority generates a partial decryption
            for share in shares_subset:
                authority_id = share["id"]
                key_share = share["key"]
                
                # Generate partial decryption
                partial = ThresholdElGamalService.generate_partial_decryption(
                    public_key_json,
                    key_share,
                    encrypted_vote
                )
                
                partial_decryptions.append((authority_id, partial["partial_decryption"]))
                print(f"Authority #{authority_id} generated partial decryption")
            
            # Combine partial decryptions to reveal the vote
            decrypted_vote = ThresholdElGamalService.combine_partial_decryptions(
                public_key_json,
                encrypted_vote,
                partial_decryptions
            )
            
            # Verify the decrypted value matches the original
            print(f"Decrypted vote: {decrypted_vote}")
            self.assertEqual(decrypted_vote, self.vote_values[i])
    
    def test_shamir_secret_sharing(self):
        """
        Test the Shamir's Secret Sharing implementation:
        1. Split secret
        2. Reconstruct secret from minimum shares
        3. Verify serialization/deserialization
        """
        print("\n=== Testing Shamir's Secret Sharing ===")
        
        secret = 123456789  # Secret to split
        n = 5  # Number of shares
        k = 3  # Threshold
        
        print(f"Splitting secret {secret} into {n} shares with threshold {k}")
        
        # Calculate prime modulus
        bits_needed = max(secret.bit_length() + 64, 512)
        prime_candidate = 2**bits_needed
        prime = next_prime(prime_candidate)
        
        # Generate shares
        shares = split_secret(secret, n, k)
        self.assertEqual(len(shares), n)
        print(f"Generated {len(shares)} shares")
        
        # Print debug info
        print(f"Prime modulus: {prime}")
        print(f"First share: {shares[0]}")
        
        # Reconstruct from minimum number of shares
        min_shares = shares[:k]
        print(f"Reconstructing from {len(min_shares)} shares")
        
        # When reconstructing, the secret might be congruent to the original secret modulo the prime
        # So we need to compare them modulo the prime
        reconstructed = reconstruct_secret(min_shares, prime)
        self.assertEqual(reconstructed % prime, secret % prime)
        print(f"Successfully reconstructed secret (mod prime): {reconstructed % prime}")
        print(f"Original secret (mod prime): {secret % prime}")
        
        # Try with more than the threshold
        more_shares = shares[:k+1]
        print(f"Reconstructing from {len(more_shares)} shares")
        reconstructed = reconstruct_secret(more_shares, prime)
        self.assertEqual(reconstructed % prime, secret % prime)
        print(f"Successfully reconstructed secret: {reconstructed % prime}")
        
        # Test serialization and deserialization
        print("Testing share serialization/deserialization")
        for share in shares:
            share_str = serialize_share(share)
            deserialized = deserialize_share(share_str)
            self.assertEqual(share, deserialized)
        print("Serialization and deserialization successful")

if __name__ == '__main__':
    unittest.main()
