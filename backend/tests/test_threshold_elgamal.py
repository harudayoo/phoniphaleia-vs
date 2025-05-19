"""
Test suite for ThresholdElGamalService
"""
import unittest
import sys
import os
import json

# Add parent directory to path to import app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app.services.crypto.threshold_elgamal import ThresholdElGamalService

class TestThresholdElGamal(unittest.TestCase):
    """Test cases for ThresholdElGamalService"""
    
    def test_key_generation(self):
        """Test key generation with various threshold parameters"""
        n = 5  # Number of authorities
        t = 3  # Threshold (minimum required for decryption)
        
        # Generate key pair
        key_data = ThresholdElGamalService.generate_key_pair(n, t)
        
        # Check structure of returned data
        self.assertIn("public_key", key_data)
        self.assertIn("key_shares", key_data)
        self.assertIn("metadata", key_data)
        
        # Check public key components
        self.assertIn("g", key_data["public_key"])
        self.assertIn("h", key_data["public_key"])
        self.assertIn("p", key_data["public_key"])
        self.assertIn("q", key_data["public_key"])
        
        # Check number of shares
        self.assertEqual(len(key_data["key_shares"]), n)
        
        # Check metadata
        self.assertEqual(key_data["metadata"]["n"], n)
        self.assertEqual(key_data["metadata"]["t"], t)
        self.assertEqual(key_data["metadata"]["crypto_type"], "threshold_elgamal")
    
    def test_vote_encryption_decryption(self):
        """Test complete flow: generate keys, encrypt vote, generate partial decryptions, combine"""
        n = 5  # Number of authorities
        t = 3  # Threshold
        vote = 42  # The vote value to encrypt/decrypt
        
        # Generate key pair
        key_data = ThresholdElGamalService.generate_key_pair(n, t)
        
        # Serialize public key
        public_key_json = json.dumps(key_data["public_key"])
        
        # Encrypt vote
        encrypted_vote = ThresholdElGamalService.encrypt_vote(public_key_json, vote)
        self.assertIn("c1", encrypted_vote)
        self.assertIn("c2", encrypted_vote)
        
        # Generate t+1 partial decryptions (we use t+1 to ensure we have enough)
        partial_decryptions = []
        for i in range(t+1):
            key_share = key_data["key_shares"][i]["key"]
            partial_dec = ThresholdElGamalService.generate_partial_decryption(
                public_key_json, key_share, encrypted_vote
            )
            partial_decryptions.append((i+1, partial_dec["partial_decryption"]))
        
        # Combine partial decryptions
        decrypted_vote = ThresholdElGamalService.combine_partial_decryptions(
            public_key_json, encrypted_vote, partial_decryptions
        )
        
        # Check that decrypted vote matches original
        self.assertEqual(decrypted_vote, vote)
    
    def test_insufficient_shares(self):
        """Test that decryption fails with insufficient shares"""
        n = 5  # Number of authorities
        t = 3  # Threshold
        vote = 123  # The vote value to encrypt/decrypt
        
        # Generate key pair
        key_data = ThresholdElGamalService.generate_key_pair(n, t)
        
        # Serialize public key
        public_key_json = json.dumps(key_data["public_key"])
        
        # Encrypt vote
        encrypted_vote = ThresholdElGamalService.encrypt_vote(public_key_json, vote)
        
        # Generate only t-1 partial decryptions (not enough)
        partial_decryptions = []
        for i in range(t-1):
            key_share = key_data["key_shares"][i]["key"]
            partial_dec = ThresholdElGamalService.generate_partial_decryption(
                public_key_json, key_share, encrypted_vote
            )
            partial_decryptions.append((i+1, partial_dec["partial_decryption"]))
        
        # Attempt to combine partial decryptions should raise an error
        with self.assertRaises(Exception):
            ThresholdElGamalService.combine_partial_decryptions(
                public_key_json, encrypted_vote, partial_decryptions
            )
    
    def test_multiple_votes(self):
        """Test encryption and decryption of multiple different votes"""
        n = 5  # Number of authorities
        t = 3  # Threshold
        votes = [0, 1, 42, 255, 1000]  # Different vote values
        
        # Generate key pair
        key_data = ThresholdElGamalService.generate_key_pair(n, t)
        
        # Serialize public key
        public_key_json = json.dumps(key_data["public_key"])
        
        # Select t authorities
        selected_authorities = key_data["key_shares"][:t]
        
        for vote in votes:
            # Encrypt vote
            encrypted_vote = ThresholdElGamalService.encrypt_vote(public_key_json, vote)
            
            # Generate partial decryptions
            partial_decryptions = []
            for i, auth in enumerate(selected_authorities):
                key_share = auth["key"]
                partial_dec = ThresholdElGamalService.generate_partial_decryption(
                    public_key_json, key_share, encrypted_vote
                )
                partial_decryptions.append((auth["id"], partial_dec["partial_decryption"]))
            
            # Combine partial decryptions
            decrypted_vote = ThresholdElGamalService.combine_partial_decryptions(
                public_key_json, encrypted_vote, partial_decryptions
            )
            
            # Check that decrypted vote matches original
            self.assertEqual(decrypted_vote, vote)

if __name__ == '__main__':
    unittest.main()
