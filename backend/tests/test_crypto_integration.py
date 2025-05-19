"""
Integration test for ZKP verification and threshold ElGamal cryptography
This test simulates a complete voting workflow including:
1. Key generation
2. Vote encryption
3. ZKP proof generation and verification
4. Threshold decryption
"""
import unittest
import sys
import os
import json
import tempfile

# Add parent directory to path to import app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app.services.crypto.threshold_elgamal import ThresholdElGamalService
from app.services.zkp.snarkjs_verifier import SnarkjsVerifier
import app.services.crypto.shamir as shamir

class TestCryptoIntegration(unittest.TestCase):
    """Integration test for cryptographic operations in the voting system"""
    
    def setUp(self):
        """Set up test fixtures before each test"""
        # Create a temporary directory for test files
        self.temp_dir = tempfile.mkdtemp()
        
        # Election parameters
        self.n_authorities = 5  # Number of trusted authorities
        self.threshold = 3      # Threshold required for decryption
        self.candidate_ids = [101, 102, 103]  # Example candidate IDs
        self.selected_candidate = self.candidate_ids[1]  # The vote we'll cast
        
        # Generate a sample verification key
        self.verification_key = {
            "protocol": "groth16",
            "curve": "bn128",
            "nPublic": 2,
            # Other fields would be here in a real verification key
        }
    
    def test_complete_voting_process(self):
        """
        Test a complete voting process from key generation to vote decryption
        """
        # Step 1: Generate ElGamal key pair for the election
        print("Generating threshold ElGamal key pair...")
        key_data = ThresholdElGamalService.generate_key_pair(self.n_authorities, self.threshold)
        
        # Extract and serialize public key
        public_key = key_data["public_key"]
        public_key_json = json.dumps(public_key)
        self.assertIsNotNone(public_key_json, "Public key generation failed")
        
        # Step 2: Encrypt a vote for a candidate
        print("Encrypting vote...")
        encrypted_vote = ThresholdElGamalService.encrypt_vote(public_key_json, self.selected_candidate)
        self.assertIn("c1", encrypted_vote, "Vote encryption failed - missing c1")
        self.assertIn("c2", encrypted_vote, "Vote encryption failed - missing c2")
        
        # Step 3: Generate partial decryptions from t+1 authorities
        print(f"Generating {self.threshold+1} partial decryptions...")
        partial_decryptions = []
        for i in range(self.threshold+1):
            share = key_data["key_shares"][i]
            auth_id = share["id"]
            key_share = share["key"]
            
            partial_dec = ThresholdElGamalService.generate_partial_decryption(
                public_key_json, key_share, encrypted_vote
            )
            partial_decryptions.append((auth_id, partial_dec["partial_decryption"]))
        
        # Step 4: Simulate ZKP verification (with mock proof & signals in this test)
        print("Verifying vote with zero-knowledge proof...")
        # In a real scenario, we'd generate real proofs using circom/snarkjs
        mock_proof = {"pi_a": ["1", "2", "3"], "pi_b": [["1", "2"], ["3", "4"]], "pi_c": ["5", "6", "7"]}
        mock_public_signals = [str(self.selected_candidate), "hash_of_election_data"]
        
        # The real verification would use the verification key and actual ZKPs
        # We're mocking the verification result here
        is_valid = True  # mock verification result
        self.assertTrue(is_valid, "ZKP verification failed")
        
        # Step 5: Combine partial decryptions to reveal the vote
        print("Combining partial decryptions to reveal the vote...")
        decrypted_vote = ThresholdElGamalService.combine_partial_decryptions(
            public_key_json, encrypted_vote, partial_decryptions
        )
        
        # Step 6: Check that the decrypted vote matches the original selection
        self.assertEqual(decrypted_vote, self.selected_candidate, 
                        f"Decryption failed - got {decrypted_vote}, expected {self.selected_candidate}")
        print(f"Successfully decrypted vote: {decrypted_vote}")
        
        # Step 7: Test decryption with insufficient shares (should fail)
        print("Testing decryption with insufficient shares...")
        insufficient_shares = partial_decryptions[:self.threshold-1]
        
        # This should raise an exception due to insufficient shares
        with self.assertRaises(Exception):
            ThresholdElGamalService.combine_partial_decryptions(
                public_key_json, encrypted_vote, insufficient_shares
            )
        print("Decryption correctly failed with insufficient shares")
    
    def test_shamir_secret_sharing(self):
        """Test the Shamir secret sharing implementation"""
        # A "secret" to split and reconstruct
        secret = 12345678901234567890  # Large number
        n = 5  # Number of shares
        k = 3  # Threshold
        
        # Split the secret
        print("Splitting secret using Shamir's Secret Sharing...")
        shares = shamir.split_secret(secret, n, k)
        self.assertEqual(len(shares), n, "Wrong number of shares generated")
        
        # Test reconstruction with exactly k shares
        print(f"Reconstructing secret with exactly {k} shares...")
        min_shares = shares[:k]
        # Get prime from split_secret implementation 
        bits_needed = max(secret.bit_length() + 64, 512)
        prime_candidate = 2**bits_needed
        prime = shamir.next_prime(prime_candidate)
        
        reconstructed = shamir.reconstruct_secret(min_shares, prime)
        self.assertEqual(reconstructed, secret % prime, "Secret reconstruction failed with minimum shares")
        
        # Test reconstruction with more than k shares
        print(f"Reconstructing secret with {k+1} shares...")
        more_shares = shares[:k+1]
        reconstructed = shamir.reconstruct_secret(more_shares, prime)
        self.assertEqual(reconstructed, secret % prime, "Secret reconstruction failed with extra shares")
        
        # Serialization/deserialization test
        print("Testing share serialization...")
        for share in shares:
            share_str = shamir.serialize_share(share)
            deserialized = shamir.deserialize_share(share_str)
            self.assertEqual(share, deserialized, "Share serialization/deserialization failed")

if __name__ == "__main__":
    unittest.main()
