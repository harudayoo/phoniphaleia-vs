"""
Test suite for VerificationController API endpoints
"""
import unittest
import sys
import os
import json
import tempfile
from unittest.mock import patch, MagicMock

# Add parent directory to path to import app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app import create_app, db
from app.models.crypto_config import CryptoConfig
from app.models.election import Election
from app.models.organization import Organization
from app.models.vote import Vote
from app.models.key_share import KeyShare

class TestVerificationController(unittest.TestCase):
    """Test cases for VerificationController API endpoints"""
    
    def setUp(self):
        """Set up test fixtures before each test"""
        # Configure app for testing
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        
        # Create application context
        self.app_context = self.app.app_context()
        self.app_context.push()
        
        # Create database tables
        db.create_all()
        
        # Set up mock data
        self.setup_mock_data()
    
    def tearDown(self):
        """Clean up test fixtures after each test"""
        # Remove database session
        db.session.remove()
        # Drop database tables
        db.drop_all()
        # Pop the application context
        self.app_context.pop()
    
    def setup_mock_data(self):
        """Set up mock data for testing"""
        # Create a test organization
        org = Organization(org_name="Test Organization")
        db.session.add(org)
        db.session.commit()
        
        # Create a test election
        election = Election(
            election_name="Test Election",
            org_id=org.org_id,
            election_status="Finished",
            date_start="2023-05-01",
            date_end="2023-05-02"
        )
        db.session.add(election)
        db.session.commit()
        self.election_id = election.election_id
          # Create crypto configs
        # Mock ElGamal config
        elgamal_config = CryptoConfig(
            election_id=self.election_id,
            key_type="threshold_elgamal",
            status="active",
            public_key=json.dumps({
                "g": "123",
                "h": "456",
                "p": "789",
                "q": "101"
            }),
            meta_data=json.dumps({
                "n": 5,
                "t": 3,
                "crypto_type": "threshold_elgamal"
            })
        )
        db.session.add(elgamal_config)
        
        # Mock ZKP verification key config
        zkp_config = CryptoConfig(
            election_id=self.election_id,            key_type="verification_key",
            status="active",
            public_key=json.dumps({
                "protocol": "groth16",
                "curve": "bn128",
                "nPublic": 2,
                "IC": [["1", "2", "3"], ["4", "5", "6"]]
            })
        )
        db.session.add(zkp_config)
        db.session.commit()
        
        self.elgamal_config_id = elgamal_config.crypto_id  # Fixed: use crypto_id instead of config_id
          # Create key shares
        key_share = KeyShare(
            crypto_id=self.elgamal_config_id,
            authority_id=1,
            share_value="123456"
        )
        db.session.add(key_share)
        db.session.commit()
        
        # Create a mock vote
        vote = Vote(
            election_id=self.election_id,
            student_id="2021-00001",
            candidate_id=1,
            position_id=1,
            vote_data=json.dumps({
                "c1": "111",
                "c2": "222"
            }),
            vote_status="cast"
        )
        db.session.add(vote)
        db.session.commit()
    
    @patch('app.services.zkp.snarkjs_verifier.SnarkjsVerifier.verify_proof')
    def test_verify_vote_zkp(self, mock_verify):
        """Test the verify_vote_zkp endpoint"""
        # Mock the verify_proof method to return True
        mock_verify.return_value = True
        
        # Prepare test data
        data = {
            "proof": {
                "pi_a": ["1", "2", "3"],
                "pi_b": [["1", "2"], ["3", "4"], ["5", "6"]],
                "pi_c": ["1", "2", "3"]
            },
            "publicSignals": ["1", "2"],
            "electionId": self.election_id
        }
        
        # Make request to the endpoint
        response = self.client.post(
            '/api/verification/verify',
            json=data,
            content_type='application/json'
        )
        
        # Check response
        self.assertEqual(response.status_code, 200)
        resp_data = json.loads(response.data)
        self.assertTrue(resp_data["valid"])
        
        # Check that the verify_proof method was called with correct parameters
        mock_verify.assert_called_once()
    
    @patch('app.services.crypto.threshold_elgamal.ThresholdElGamalService.generate_partial_decryption')
    def test_submit_partial_decryption(self, mock_generate):
        """Test the submit_partial_decryption endpoint"""
        # Mock the generate_partial_decryption method
        mock_generate.return_value = {
            "partial_decryption": "987654"
        }
        
        # Prepare test data
        data = {
            "encryptedVote": {
                "c1": "111",
                "c2": "222"
            },
            "electionId": self.election_id,
            "authorityId": 1,
            "keyShareId": 1
        }
        
        # Mock the trusted_authority_required decorator to allow the request
        with patch('app.utils.auth.trusted_authority_required', lambda f: f):
            # Make request to the endpoint
            response = self.client.post(
                '/api/verification/decrypt/submit-partial',
                json=data,
                content_type='application/json'
            )
            
            # Check response
            self.assertEqual(response.status_code, 200)
            resp_data = json.loads(response.data)
            self.assertEqual(resp_data["id"], 1)
            self.assertEqual(resp_data["partialDecryption"], "987654")
            
            # Check that the generate_partial_decryption method was called
            mock_generate.assert_called_once()
    
    @patch('app.services.crypto.threshold_elgamal.ThresholdElGamalService.combine_partial_decryptions')
    def test_decrypt_vote(self, mock_combine):
        """Test the decrypt_vote endpoint"""
        # Mock the combine_partial_decryptions method
        mock_combine.return_value = 42
        
        # Prepare test data
        data = {
            "encryptedVote": {
                "c1": "111",
                "c2": "222"
            },
            "electionId": self.election_id,
            "partialDecryptions": [
                {"id": 1, "partialDecryption": "123"},
                {"id": 2, "partialDecryption": "456"},
                {"id": 3, "partialDecryption": "789"}
            ]
        }
        
        # Mock the admin_required decorator to allow the request
        with patch('app.utils.auth.admin_required', lambda f: f):
            # Make request to the endpoint
            response = self.client.post(
                '/api/verification/decrypt/vote',
                json=data,
                content_type='application/json'
            )
            
            # Check response
            self.assertEqual(response.status_code, 200)
            resp_data = json.loads(response.data)
            self.assertEqual(resp_data["decryptedVote"], 42)
            
            # Check that the combine_partial_decryptions method was called
            mock_combine.assert_called_once()

if __name__ == '__main__':
    unittest.main()
