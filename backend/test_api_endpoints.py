#!/usr/bin/env python3
"""
Test script to verify the backend API endpoints with the fixed crypto implementation.
Tests all crypto-related endpoints to ensure they work correctly.
"""

import requests
import json
import sys
import time
from datetime import datetime, timedelta

# Backend server URL
BASE_URL = "http://localhost:5000"

def test_api_connection():
    """Test basic API connection"""
    print("\n=== Testing API Connection ===")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✓ Backend API is accessible")
            return True
        else:
            print(f"✗ Backend API returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to backend API. Make sure the server is running on localhost:5000")
        return False
    except Exception as e:
        print(f"✗ API connection test failed: {e}")
        return False

def test_crypto_config_generation():
    """Test crypto configuration generation endpoint"""
    print("\n=== Testing Crypto Configuration Generation ===")
    try:
        # Test generating crypto config
        payload = {
            "threshold": 3,
            "n_personnel": 5,
            "key_size": 1024
        }
        
        response = requests.post(f"{BASE_URL}/api/crypto-config/generate", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print("✓ Crypto configuration generated successfully")
            print(f"  - Public key modulus length: {len(data.get('public_key', {}).get('n', ''))} digits")
            print(f"  - Number of key shares: {len(data.get('key_shares', []))}")
            print(f"  - Threshold: {data.get('threshold', 'N/A')}")
            return data
        else:
            print(f"✗ Crypto config generation failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ Crypto config generation test failed: {e}")
        return None

def test_vote_encryption(public_key):
    """Test vote encryption endpoint"""
    print("\n=== Testing Vote Encryption ===")
    try:
        # Test encrypting a vote
        payload = {
            "public_key": public_key,
            "candidate_id": 1,
            "position_id": 1
        }
        
        response = requests.post(f"{BASE_URL}/api/votes/encrypt", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print("✓ Vote encryption successful")
            print(f"  - Encrypted vote length: {len(data.get('encrypted_vote', ''))} characters")
            print(f"  - ZKP provided: {'zkp' in data}")
            return data
        else:
            print(f"✗ Vote encryption failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ Vote encryption test failed: {e}")
        return None

def test_homomorphic_tallying(encrypted_votes):
    """Test homomorphic tallying endpoint"""
    print("\n=== Testing Homomorphic Tallying ===")
    try:
        # Test tallying encrypted votes
        payload = {
            "encrypted_votes": encrypted_votes,
            "position_id": 1
        }
        
        response = requests.post(f"{BASE_URL}/api/tallying/homomorphic", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print("✓ Homomorphic tallying successful")
            print(f"  - Encrypted totals computed: {len(data.get('encrypted_totals', {}))}")
            return data
        else:
            print(f"✗ Homomorphic tallying failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ Homomorphic tallying test failed: {e}")
        return None

def test_key_share_submission(key_shares):
    """Test key share submission endpoint"""
    print("\n=== Testing Key Share Submission ===")
    try:
        # Test submitting key shares
        success_count = 0
        
        for i, share in enumerate(key_shares[:3]):  # Submit threshold number of shares
            payload = {
                "personnel_id": i + 1,
                "share_value": share
            }
            
            response = requests.post(f"{BASE_URL}/api/key-shares/submit", json=payload)
            
            if response.status_code == 200:
                success_count += 1
            else:
                print(f"✗ Key share {i+1} submission failed with status {response.status_code}")
        
        if success_count > 0:
            print(f"✓ Successfully submitted {success_count} key shares")
            return True
        else:
            print("✗ No key shares were successfully submitted")
            return False
            
    except Exception as e:
        print(f"✗ Key share submission test failed: {e}")
        return False

def test_private_key_reconstruction():
    """Test private key reconstruction endpoint"""
    print("\n=== Testing Private Key Reconstruction ===")
    try:
        response = requests.post(f"{BASE_URL}/api/crypto-config/reconstruct-key")
        
        if response.status_code == 200:
            data = response.json()
            print("✓ Private key reconstruction successful")
            print(f"  - Key reconstructed: {data.get('success', False)}")
            return data
        else:
            print(f"✗ Private key reconstruction failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ Private key reconstruction test failed: {e}")
        return None

def test_final_tally_decryption(encrypted_totals):
    """Test final tally decryption endpoint"""
    print("\n=== Testing Final Tally Decryption ===")
    try:
        payload = {
            "encrypted_totals": encrypted_totals
        }
        
        response = requests.post(f"{BASE_URL}/api/results/decrypt", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print("✓ Final tally decryption successful")
            print(f"  - Decrypted results: {data.get('results', {})}")
            return data
        else:
            print(f"✗ Final tally decryption failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ Final tally decryption test failed: {e}")
        return None

def test_zkp_verification(encrypted_vote, zkp):
    """Test ZKP verification endpoint"""
    print("\n=== Testing ZKP Verification ===")
    try:
        payload = {
            "encrypted_vote": encrypted_vote,
            "zkp": zkp,
            "candidate_id": 1
        }
        
        response = requests.post(f"{BASE_URL}/api/verification/zkp", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ ZKP verification result: {data.get('valid', False)}")
            return data.get('valid', False)
        else:
            print(f"✗ ZKP verification failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ ZKP verification test failed: {e}")
        return False

def run_complete_election_flow():
    """Run complete election flow through API endpoints"""
    print("\n" + "=" * 60)
    print("RUNNING COMPLETE ELECTION FLOW TEST")
    print("=" * 60)
    
    # Step 1: Test API connection
    if not test_api_connection():
        return False
    
    # Step 2: Generate crypto configuration
    crypto_config = test_crypto_config_generation()
    if not crypto_config:
        return False
    
    public_key = crypto_config.get('public_key')
    key_shares = crypto_config.get('key_shares', [])
    
    # Step 3: Test vote encryption (simulate multiple votes)
    encrypted_votes = []
    zkps = []
    
    print("\n=== Encrypting Multiple Votes ===")
    for i in range(3):  # Simulate 3 votes
        vote_data = test_vote_encryption(public_key)
        if vote_data:
            encrypted_votes.append(vote_data.get('encrypted_vote'))
            zkps.append(vote_data.get('zkp'))
            print(f"✓ Vote {i+1} encrypted")
        else:
            print(f"✗ Vote {i+1} encryption failed")
            return False
    
    # Step 4: Test ZKP verification for first vote
    if encrypted_votes and zkps:
        test_zkp_verification(encrypted_votes[0], zkps[0])
    
    # Step 5: Test homomorphic tallying
    encrypted_totals_data = test_homomorphic_tallying(encrypted_votes)
    if not encrypted_totals_data:
        return False
    
    encrypted_totals = encrypted_totals_data.get('encrypted_totals', {})
    
    # Step 6: Test key share submission
    if not test_key_share_submission(key_shares):
        return False
    
    # Step 7: Test private key reconstruction
    if not test_private_key_reconstruction():
        return False
    
    # Step 8: Test final tally decryption
    final_results = test_final_tally_decryption(encrypted_totals)
    if not final_results:
        return False
    
    print("\n" + "=" * 60)
    print("🎉 COMPLETE ELECTION FLOW TEST SUCCESSFUL!")
    print("=" * 60)
    print("All API endpoints are working correctly with the fixed crypto implementation.")
    
    return True

def test_individual_endpoints():
    """Test individual endpoints for debugging"""
    print("\n" + "=" * 60)
    print("TESTING INDIVIDUAL ENDPOINTS")
    print("=" * 60)
    
    tests = [
        ("API Connection", test_api_connection),
        ("Crypto Config Generation", lambda: test_crypto_config_generation() is not None),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
            print(f"{'✓' if result else '✗'} {test_name}: {'PASS' if result else 'FAIL'}")
        except Exception as e:
            print(f"✗ {test_name}: FAIL ({e})")
            results.append((test_name, False))
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    print(f"\nIndividual tests: {passed}/{total} passed")
    
    return passed == total

def main():
    """Main test function"""
    print("Backend API Endpoints Test Suite")
    print("=" * 60)
    print(f"Testing against: {BASE_URL}")
    print(f"Time: {datetime.now()}")
    
    # Give server a moment to be ready
    print("\nWaiting 2 seconds for server to be ready...")
    time.sleep(2)
    
    try:
        # First test individual endpoints
        individual_success = test_individual_endpoints()
        
        if individual_success:
            # Then run complete flow
            flow_success = run_complete_election_flow()
            return flow_success
        else:
            print("\n❌ Individual endpoint tests failed. Skipping complete flow test.")
            return False
            
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
        return False
    except Exception as e:
        print(f"\n❌ Test suite failed with exception: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
