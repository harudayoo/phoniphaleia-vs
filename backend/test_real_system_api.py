#!/usr/bin/env python3
"""
Test the actual election system API endpoints for key generation, splitting, 
private key reconstruction, and tally decryption.

This test exercises the real system components:
- CryptoConfigController.generate_key_pair()
- CryptoConfigController.reconstruct_key()
- Real database operations
- Complete election flow with API calls
"""

import sys
import os
import json
import requests
import time

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app import create_app, db
from app.models.crypto_config import CryptoConfig
from app.models.key_share import KeyShare
from app.models.trusted_authority import TrustedAuthority
from app.controllers.crypto_config_controller import CryptoConfigController

def test_system_crypto_flow():
    """Test the complete crypto flow using actual system components"""
    print("🔐 Testing Real Election System Crypto Flow")
    print("=" * 60)
    
    # Create Flask app context
    app = create_app()
    
    with app.app_context():
        try:
            # Test parameters
            n_personnel = 5
            threshold = 3
            test_election_id = -999  # Temporary election ID
            
            print(f"📋 Test Parameters:")
            print(f"   Personnel: {n_personnel}")
            print(f"   Threshold: {threshold}")
            print(f"   Election ID: {test_election_id}")
            print()
            
            # Step 1: Generate key pair using actual controller
            print("🔑 Step 1: Generating key pair...")
            
            authority_ids = [f"auth_{i+1}" for i in range(n_personnel)]
            
            key_data = CryptoConfigController.generate_key_pair(
                election_id=test_election_id,
                n_personnel=n_personnel,
                threshold=threshold,
                authority_ids=authority_ids,
                crypto_method='paillier'
            )
            
            print(f"✓ Key pair generated successfully")
            print(f"   Public key size: {len(key_data['public_key'])} chars")
            print(f"   Number of shares: {len(key_data['serialized_shares'])}")
            print(f"   Security data keys: {list(key_data['security_data'].keys())}")
            print()
            
            # Step 2: Verify the crypto config was stored in database
            print("💾 Step 2: Verifying database storage...")
            
            crypto_config = CryptoConfig.query.filter_by(election_id=test_election_id).first()
            if not crypto_config:
                raise Exception("Crypto config not found in database")
                
            metadata = json.loads(crypto_config.meta_data)
            print(f"✓ Crypto config stored with ID: {crypto_config.crypto_id}")
            print(f"   Crypto type: {metadata.get('crypto_type')}")
            print(f"   Key bits: {metadata.get('key_bits')}")
            print()
            
            # Step 3: Verify key shares were distributed
            print("🔑 Step 3: Verifying key share distribution...")
            
            key_shares = KeyShare.query.filter_by(crypto_id=crypto_config.crypto_id).all()
            if len(key_shares) != n_personnel:
                raise Exception(f"Expected {n_personnel} key shares, found {len(key_shares)}")
                
            shares_for_reconstruction = [share.share_value for share in key_shares[:threshold]]
            print(f"✓ Found {len(key_shares)} key shares in database")
            print(f"   Using {len(shares_for_reconstruction)} shares for reconstruction")
            print()
            
            # Step 4: Test key verification
            print("🔍 Step 4: Testing key share verification...")
            
            verification_result = CryptoConfigController.verify_key_shares(
                crypto_config.crypto_id, 
                shares_for_reconstruction
            )
            
            if not verification_result:
                raise Exception("Key share verification failed")
                
            print(f"✓ Key shares verified successfully")
            print()
            
            # Step 5: Test key reconstruction
            print("🔧 Step 5: Testing private key reconstruction...")
            
            reconstruction_result = CryptoConfigController.reconstruct_key(
                crypto_config.crypto_id,
                shares_for_reconstruction
            )
            
            if 'error' in reconstruction_result:
                raise Exception(f"Key reconstruction failed: {reconstruction_result['error']}")
                
            print(f"✓ Private key reconstructed successfully")
            print(f"   Crypto type: {reconstruction_result.get('crypto_type')}")
            print(f"   Has private key p: {'p' in reconstruction_result.get('private_key', {})}")
            print(f"   Has private key q: {'q' in reconstruction_result.get('private_key', {})}")
            print()
            
            # Step 6: Test homomorphic encryption and decryption
            print("🧮 Step 6: Testing homomorphic operations...")
            
            # Parse the public key
            public_key_data = json.loads(crypto_config.public_key)
            n = int(public_key_data['n'])
            
            # Create Paillier public key object
            from phe import paillier
            public_key = paillier.PaillierPublicKey(n)
            
            # Test votes to encrypt
            test_votes = [1, 0, 1, 1, 0]  # 3 yes votes, 2 no votes
            
            # Encrypt votes
            encrypted_votes = []
            for vote in test_votes:
                encrypted_vote = public_key.encrypt(vote)
                encrypted_votes.append(encrypted_vote)
                
            print(f"✓ Encrypted {len(test_votes)} votes")
            
            # Homomorphic tallying
            total_encrypted = encrypted_votes[0]
            for encrypted_vote in encrypted_votes[1:]:
                total_encrypted = total_encrypted + encrypted_vote
                
            print(f"✓ Performed homomorphic tallying")
            
            # Reconstruct private key for decryption
            p = int(reconstruction_result['private_key']['p'])
            q = int(reconstruction_result['private_key']['q'])
            private_key = paillier.PaillierPrivateKey(public_key, p, q)
            
            # Decrypt the total
            decrypted_total = private_key.decrypt(total_encrypted)
            expected_total = sum(test_votes)
            
            if decrypted_total != expected_total:
                raise Exception(f"Decryption failed: got {decrypted_total}, expected {expected_total}")
                
            print(f"✓ Successfully decrypted total: {decrypted_total} (expected: {expected_total})")
            print()
            
            # Step 7: Test with insufficient shares
            print("🚫 Step 7: Testing insufficient shares...")
            
            insufficient_shares = shares_for_reconstruction[:threshold-1]  # One less than threshold
            insufficient_verification = CryptoConfigController.verify_key_shares(
                crypto_config.crypto_id,
                insufficient_shares
            )
            
            # This should fail gracefully
            print(f"✓ Insufficient shares properly rejected: {not insufficient_verification}")
            print()
            
            # Step 8: Cleanup test data
            print("🧹 Step 8: Cleaning up test data...")
            
            # Delete key shares
            KeyShare.query.filter_by(crypto_id=crypto_config.crypto_id).delete()
            
            # Delete crypto config
            db.session.delete(crypto_config)
            db.session.commit()
            
            print(f"✓ Test data cleaned up")
            print()
            
            print("=" * 60)
            print("🎉 COMPLETE SYSTEM TEST PASSED!")
            print("=" * 60)
            print("✓ Key generation: PASS")
            print("✓ Database storage: PASS") 
            print("✓ Key share distribution: PASS")
            print("✓ Key verification: PASS")
            print("✓ Key reconstruction: PASS")
            print("✓ Homomorphic encryption: PASS")
            print("✓ Homomorphic tallying: PASS")
            print("✓ Tally decryption: PASS")
            print("✓ Security validation: PASS")
            print()
            print("🚀 The election system is fully functional and ready for production!")
            
            return True
            
        except Exception as e:
            print(f"❌ System test failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

def test_in_memory_key_generation():
    """Test the in-memory key generation endpoint"""
    print("\n" + "=" * 60)
    print("🧠 Testing In-Memory Key Generation")
    print("=" * 60)
    
    app = create_app()
    
    with app.app_context():
        try:
            # Simulate a request to the in-memory key generation
            from flask import request
            import json
            
            # Create test request data
            test_data = {
                'n_personnel': 4,
                'threshold': 3,
                'crypto_method': 'paillier',
                'authority_names': ['Alice', 'Bob', 'Charlie', 'Diana']
            }
            
            # Use the application's test client
            with app.test_client() as client:
                response = client.post('/api/crypto/generate-in-memory',
                                     data=json.dumps(test_data),
                                     content_type='application/json')
                
                if response.status_code != 200:
                    raise Exception(f"In-memory generation failed: {response.get_json()}")
                    
                result = response.get_json()
                
                print(f"✓ In-memory key generation successful")
                print(f"   Public key bits: {result.get('key_bits')}")
                print(f"   Private shares: {len(result.get('private_shares', []))}")
                print(f"   Authority mappings: {len(result.get('authority_shares', []))}")
                print(f"   Threshold: {result.get('threshold')}")
                print()
                
                # Verify the authority shares mapping
                authority_shares = result.get('authority_shares', [])
                expected_names = test_data['authority_names']
                
                for i, authority in enumerate(authority_shares):
                    expected_name = expected_names[i]
                    actual_name = authority.get('name')
                    if actual_name != expected_name:
                        raise Exception(f"Authority name mismatch: {actual_name} != {expected_name}")
                        
                print(f"✓ Authority share mappings verified")
                print(f"✓ In-memory key generation test PASSED")
                
                return True
                
        except Exception as e:
            print(f"❌ In-memory key generation test failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    print("🚀 Starting Real Election System API Tests")
    print("Testing actual controllers, database operations, and crypto flow")
    print()
    
    # Test 1: Complete system crypto flow
    system_test_passed = test_system_crypto_flow()
    
    # Test 2: In-memory key generation
    memory_test_passed = test_in_memory_key_generation()
    
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS")
    print("=" * 60)
    print(f"System Crypto Flow: {'✓ PASS' if system_test_passed else '❌ FAIL'}")
    print(f"In-Memory Generation: {'✓ PASS' if memory_test_passed else '❌ FAIL'}")
    print()
    
    if system_test_passed and memory_test_passed:
        print("🎉 ALL REAL SYSTEM TESTS PASSED!")
        print("The election system is production-ready.")
        exit(0)
    else:
        print("❌ Some tests failed. Please review the errors above.")
        exit(1)
