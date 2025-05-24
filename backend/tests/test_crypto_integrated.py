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

import shamirs
from app.services.zkp.snarkjs_verifier import SnarkjsVerifier

# Helper for next_prime if sympy is not available
try:
    from sympy import nextprime as next_prime
except ImportError:
    def next_prime(n):
        def is_prime(num):
            if num < 2:
                return False
            if num == 2:
                return True
            if num % 2 == 0:
                return False
            # Use integer square root to avoid overflow with very large numbers
            sqrt_num = int(num ** 0.5) if num < 10**15 else isqrt(num)
            for i in range(3, sqrt_num + 1, 2):
                if num % i == 0:
                    return False
            return True
        
        def isqrt(n):
            """Integer square root for very large numbers"""
            if n < 0:
                raise ValueError("Square root not defined for negative numbers")
            if n == 0:
                return 0
            x = n
            y = (x + 1) // 2
            while y < x:
                x = y
                y = (x + n // x) // 2
            return x
            
        candidate = n + 1
        while not is_prime(candidate):
            candidate += 1
        return candidate

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
        
        # Generate shares using shamirs library
        shares_raw = shamirs.shares(secret, quantity=n, modulus=prime, threshold=k)
        self.assertEqual(len(shares_raw), n)
        print(f"Generated {len(shares_raw)} shares")
        
        # Print debug info
        print(f"Prime modulus: {prime}")
        print(f"First share: {shares_raw[0]}")
        
        # Reconstruct from minimum number of shares
        min_shares = shares_raw[:k]
        print(f"Reconstructing from {len(min_shares)} shares")
        
        # When reconstructing, the secret might be congruent to the original secret modulo the prime
        # So we need to compare them modulo the prime
        reconstructed = shamirs.interpolate(min_shares)
        self.assertEqual(reconstructed % prime, secret % prime)
        print(f"Successfully reconstructed secret (mod prime): {reconstructed % prime}")
        print(f"Original secret (mod prime): {secret % prime}")
        
        # Try with more than the threshold
        more_shares = shares_raw[:k+1]
        print(f"Reconstructing from {len(more_shares)} shares")
        reconstructed = shamirs.interpolate(more_shares)
        self.assertEqual(reconstructed % prime, secret % prime)
        print(f"Successfully reconstructed secret: {reconstructed % prime}")
        
        # Test serialization and deserialization
        print("Testing share serialization/deserialization")
        for share in shares_raw:
            # Serialize as x:hex(y)
            share_str = f"{share[0]}:{hex(share[1])[2:]}"
            # Deserialize
            x_str, y_hex = share_str.split(':', 1)
            deserialized = (int(x_str), int(y_hex, 16))
            self.assertEqual(share, deserialized)
        print("Serialization and deserialization successful")

if __name__ == '__main__':
    unittest.main()
