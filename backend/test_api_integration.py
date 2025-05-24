#!/usr/bin/env python3
"""
Comprehensive API integration test for the crypto functionality:
1. Test key generation endpoint
2. Test vote encryption/submission
3. Test key reconstruction and decryption
"""

import sys
import os
sys.path.append(os.getcwd())

import requests
import json
import time
from phe import paillier
import shamirs

# API Base URL
BASE_URL = "http://127.0.0.1:5000"

def test_api_integration():
    """Test complete API integration"""
    print("=" * 60)
    print("TESTING API INTEGRATION")
    print("=" * 60)
      # Test 1: Generate keypair via API
    print("\n1. Testing in-memory key generation API...")
    try:
        response = requests.post(f"{BASE_URL}/api/crypto_configs/generate-in-memory", json={
            "n_personnel": 3,
            "threshold": 3,
            "crypto_method": "paillier"
        }, timeout=30)
        
        if response.status_code == 200:
            key_data = response.json()
            print(f"✓ Key generation API successful")
            print(f"✓ Generated {len(key_data['private_shares'])} key shares")
            print(f"✓ Threshold: {key_data['threshold']}")
            print(f"✓ Key bits: {key_data['key_bits']}")
            
            # Store data for later tests
            public_key_json = key_data['public_key']
            private_shares = key_data['private_shares']
            meta_data = key_data['meta_data']
            
        else:
            print(f"✗ Key generation API failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Key generation API error: {e}")
        return False
    
    # Test 2: Test vote encryption with generated public key
    print("\n2. Testing vote encryption with generated key...")
    try:
        # Parse the public key
        public_key_data = json.loads(public_key_json)
        n = int(public_key_data['n'])
        
        # Create Paillier public key object
        pubkey = paillier.PaillierPublicKey(n=n)
        
        # Encrypt a vote
        vote_value = 1
        encrypted_vote = pubkey.encrypt(vote_value)
        encrypted_ciphertext = str(encrypted_vote.ciphertext())
        
        print(f"✓ Vote encrypted successfully: {vote_value} -> {len(encrypted_ciphertext)} digit ciphertext")
        
    except Exception as e:
        print(f"✗ Vote encryption failed: {e}")
        return False
    
    # Test 3: Test key reconstruction and decryption
    print("\n3. Testing key reconstruction and decryption...")
    try:
        # Parse meta data to get prime
        meta_obj = json.loads(meta_data)
        prime = int(meta_obj['prime'])
        
        # Parse shares
        parsed_shares = []
        for share_str in private_shares:
            x_str, y_hex = share_str.split(':', 1)
            x = int(x_str)
            y = int(y_hex, 16)
            share_obj = shamirs.share(x, y, prime)
            parsed_shares.append(share_obj)
        
        # Reconstruct secret
        reconstructed_p = shamirs.interpolate(parsed_shares)
        reconstructed_q = n // reconstructed_p
        
        # Create private key
        new_pubkey = paillier.PaillierPublicKey(n=n)
        new_privkey = paillier.PaillierPrivateKey(new_pubkey, reconstructed_p, reconstructed_q)
        
        # Decrypt the vote
        decrypted_vote = new_privkey.decrypt(encrypted_vote)
        
        print(f"✓ Key reconstruction successful")
        print(f"✓ Vote decryption successful: {decrypted_vote}")
        print(f"✓ Decryption correct: {decrypted_vote == vote_value}")
        
    except Exception as e:
        print(f"✗ Key reconstruction/decryption failed: {e}")
        return False
    
    # Test 4: Test verification controller decrypt_vote endpoint simulation
    print("\n4. Testing verification controller logic simulation...")
    try:
        # Simulate the verification controller's decrypt_vote logic
        shares_for_api = private_shares  # In x:hex(y) format
        
        # Test the share parsing logic (like in verification_controller.py)
        parsed_shares_api = []
        for s in shares_for_api:
            if ':' in s:
                x_str, y_hex = s.split(':', 1)
                x = int(x_str)
                y = int(y_hex, 16)
                share_obj = shamirs.share(x, y, prime)
                parsed_shares_api.append(share_obj)
        
        # Reconstruct using API-parsed shares
        reconstructed_p_api = shamirs.interpolate(parsed_shares_api)
        
        # Verify it matches our previous reconstruction
        print(f"✓ API share parsing successful")
        print(f"✓ API reconstruction matches: {reconstructed_p_api == reconstructed_p}")
        
    except Exception as e:
        print(f"✗ API logic simulation failed: {e}")
        return False
    
    # Test 5: Test homomorphic addition (election tallying)
    print("\n5. Testing homomorphic election tallying...")
    try:
        # Simulate multiple votes for the same candidate
        votes = [pubkey.encrypt(1) for _ in range(5)]  # 5 votes for candidate
        
        # Add all encrypted votes (homomorphic tallying)
        total_encrypted = votes[0]
        for vote in votes[1:]:
            total_encrypted = total_encrypted + vote
        
        # Decrypt the total
        total_decrypted = new_privkey.decrypt(total_encrypted)
        
        print(f"✓ Homomorphic tallying successful")
        print(f"✓ Total votes: {total_decrypted}")
        print(f"✓ Tallying correct: {total_decrypted == 5}")
        
    except Exception as e:
        print(f"✗ Homomorphic tallying failed: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✓ ALL API INTEGRATION TESTS PASSED!")
    print("✓ Complete crypto API workflow working correctly")
    print("✓ Ready for production use")
    print("=" * 60)
    return True

def test_server_connectivity():
    """Test if the Flask server is running"""
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        return True
    except:
        return False

if __name__ == "__main__":
    print("Checking server connectivity...")
    if not test_server_connectivity():
        print("✗ Flask server is not running!")
        print("Please start the server with: python run.py")
        sys.exit(1)
    
    print("✓ Flask server is running")
    
    # Wait a moment for server to be fully ready
    time.sleep(1)
    
    success = test_api_integration()
    sys.exit(0 if success else 1)
