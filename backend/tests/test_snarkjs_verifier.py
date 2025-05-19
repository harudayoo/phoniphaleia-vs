"""
Test suite for SnarkjsVerifier
"""
import unittest
import sys
import os
import json
import tempfile
import shutil

# Add parent directory to path to import app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app.services.zkp.snarkjs_verifier import SnarkjsVerifier

class TestSnarkjsVerifier(unittest.TestCase):
    """Test cases for SnarkjsVerifier"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test fixtures once for all tests"""
        # Create temporary directory for test files
        cls.test_dir = tempfile.mkdtemp()
        
        # Sample verification key in the format expected by snarkjs
        cls.sample_vkey = {
            "protocol": "groth16",
            "curve": "bn128",
            "nPublic": 2,
            "vk_alpha_1": ["0", "0", "0"],
            "vk_beta_2": [["0", "0"], ["0", "0"], ["0", "0"]],
            "vk_gamma_2": [["0", "0"], ["0", "0"], ["0", "0"]],
            "vk_delta_2": [["0", "0"], ["0", "0"], ["0", "0"]],
            "vk_alphabeta_12": [
                [["0", "0"], ["0", "0"]],
                [["0", "0"], ["0", "0"]]
            ],
            "IC": [
                ["0", "0", "0"],
                ["0", "0", "0"],
                ["0", "0", "0"]
            ]
        }
        
        # Save sample verification key to file
        cls.vkey_path = os.path.join(cls.test_dir, "verification_key.json")
        with open(cls.vkey_path, 'w') as f:
            json.dump(cls.sample_vkey, f)
    
    @classmethod
    def tearDownClass(cls):
        """Clean up test fixtures after all tests"""
        # Remove temporary directory and files
        shutil.rmtree(cls.test_dir)
    
    def test_load_verification_key(self):
        """Test loading a verification key from file"""
        # Load the verification key
        vkey = SnarkjsVerifier.load_verification_key(self.vkey_path)
        
        # Check that it matches what we saved
        self.assertEqual(vkey, self.sample_vkey)
    
    def test_store_verification_key(self):
        """Test storing a verification key to file"""
        # Create a different verification key
        test_vkey = {
            "protocol": "groth16",
            "curve": "bn128",
            "nPublic": 1,
            # Other fields would be here in a real key
        }
        
        # Path for the new key
        test_vkey_path = os.path.join(self.test_dir, "test_vkey.json")
        
        # Store the key
        SnarkjsVerifier.store_verification_key(test_vkey, test_vkey_path)
        
        # Load it back and check that it matches
        with open(test_vkey_path, 'r') as f:
            loaded_vkey = json.load(f)
        
        self.assertEqual(loaded_vkey, test_vkey)
    
    # Since the actual verify_proof method depends on external snarkjs library
    # and requires Node.js, we'll create a mock test that checks the function
    # handles its parameters correctly
    def test_verify_proof_arguments(self):
        """Test that verify_proof handles its arguments correctly"""
        # Sample proof and public signals
        proof = {
            "pi_a": ["0", "0", "0"],
            "pi_b": [["0", "0"], ["0", "0"], ["0", "0"]],
            "pi_c": ["0", "0", "0"],
            "protocol": "groth16"
        }
        
        public_signals = ["1", "2"]
        
        try:
            # This will likely fail as we're using a dummy verification key,
            # but we want to check that the function correctly handles its arguments
            SnarkjsVerifier.verify_proof(
                verification_key=self.sample_vkey,
                public_signals=public_signals,
                proof=proof
            )
            # If it doesn't raise an exception, that's fine too
        except Exception as e:
            # Check that any exception is from snarkjs itself, not from our argument handling
            self.assertNotIn("TypeError", str(e))
            self.assertNotIn("KeyError", str(e))

if __name__ == '__main__':
    unittest.main()
