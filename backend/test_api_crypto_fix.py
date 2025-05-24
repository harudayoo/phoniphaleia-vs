#!/usr/bin/env python3
"""
Test the API endpoints with the crypto fix to ensure end-to-end functionality works.
"""

import requests
import json
import sys
import os

# Configuration
BASE_URL = "http://localhost:5000"

def test_key_generation_and_reconstruction():
    """Test the complete flow: key generation -> share distribution -> reconstruction"""
    print("Testing API Crypto Fix")
    print("=" * 50)
    
    try:
        # Step 1: Generate a temporary election ID
        print("Step 1: Generating temporary election ID...")
        response = requests.post(f"{BASE_URL}/crypto/generate-temp-election-id")
        if response.status_code != 200:
            print(f"❌ Failed to generate temp election ID: {response.status_code}")
            return False
        
        temp_data = response.json()
        temp_election_id = temp_data['temp_election_id']
        print(f"✅ Generated temporary election ID: {temp_election_id}")
        
        # Step 2: Generate key pair with the fixed crypto logic
        print("Step 2: Generating key pair with fixed crypto logic...")
        key_gen_data = {
            "election_id": temp_election_id,
            "n_personnel": 3,
            "threshold": 2,
            "crypto_method": "paillier"
        }
        
        response = requests.post(f"{BASE_URL}/crypto/generate-key-pair", json=key_gen_data)
        if response.status_code != 200:
            print(f"❌ Key generation failed: {response.status_code} - {response.text}")
            return False
        
        key_data = response.json()
        print(f"✅ Key pair generated successfully")
        print(f"   Crypto ID: {key_data.get('crypto_id')}")
        print(f"   Shares generated: {len(key_data.get('serialized_shares', []))}")
        
        crypto_id = key_data.get('crypto_id')
        shares = key_data.get('serialized_shares', [])
        
        if not crypto_id or not shares:
            print("❌ Missing crypto_id or shares in response")
            return False
        
        # Step 3: Test private key reconstruction using the new fix
        print("Step 3: Testing private key reconstruction...")
        
        # Use threshold number of shares (2 out of 3)
        reconstruction_shares = shares[:2]
        
        reconstruct_data = {
            "crypto_id": crypto_id,
            "shares": reconstruction_shares
        }
        
        response = requests.post(f"{BASE_URL}/crypto/reconstruct-key", json=reconstruct_data)
        if response.status_code != 200:
            print(f"❌ Key reconstruction failed: {response.status_code} - {response.text}")
            return False
        
        reconstruct_result = response.json()
        print(f"✅ Key reconstruction successful!")
        print(f"   Crypto type: {reconstruct_result.get('crypto_type')}")
        print(f"   Has private key: {'private_key' in reconstruct_result}")
        
        if reconstruct_result.get('success') != True:
            print(f"❌ Reconstruction reported failure: {reconstruct_result}")
            return False
        
        # Step 4: Verify key shares work correctly
        print("Step 4: Verifying key shares...")
        
        verify_data = {
            "crypto_id": crypto_id,
            "shares": reconstruction_shares
        }
        
        response = requests.post(f"{BASE_URL}/crypto/verify-shares", json=verify_data)
        if response.status_code != 200:
            print(f"❌ Share verification failed: {response.status_code} - {response.text}")
            return False
        
        verify_result = response.json()
        if verify_result.get('valid') != True:
            print(f"❌ Shares verification failed: {verify_result}")
            return False
        
        print(f"✅ Share verification successful!")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the API server.")
        print("   Make sure the Flask server is running on http://localhost:5000")
        print("   Run: python run.py")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_in_memory_generation():
    """Test the in-memory key generation endpoint"""
    print("\nTesting In-Memory Key Generation")
    print("=" * 50)
    
    try:
        in_memory_data = {
            "n_personnel": 3,
            "threshold": 2,
            "crypto_method": "paillier",
            "authority_names": ["Authority1", "Authority2", "Authority3"]
        }
        
        response = requests.post(f"{BASE_URL}/crypto/generate-key-pair-in-memory", json=in_memory_data)
        if response.status_code != 200:
            print(f"❌ In-memory generation failed: {response.status_code} - {response.text}")
            return False
        
        result = response.json()
        print(f"✅ In-memory key generation successful!")
        print(f"   Crypto type: {result.get('crypto_type')}")
        print(f"   Key bits: {result.get('key_bits')}")
        print(f"   Shares: {len(result.get('private_shares', []))}")
        print(f"   Authority mappings: {len(result.get('authority_shares', []))}")
        
        # Check if metadata contains the fixed prime structure
        meta_data = result.get('meta_data', {})
        if 'p' in meta_data and 'prime_modulus' in meta_data:
            print(f"✅ Metadata contains both Paillier prime 'p' and Shamir modulus")
        else:
            print(f"❌ Metadata missing required prime data")
            return False
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the API server.")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("API Crypto Fix Testing")
    print("=" * 60)
    print("NOTE: This test requires the Flask server to be running.")
    print("      Run 'python run.py' in another terminal if it's not running.")
    print()
    
    test1_passed = test_key_generation_and_reconstruction()
    test2_passed = test_in_memory_generation()
    
    print("\n" + "=" * 60)
    print("SUMMARY:")
    print(f"✅ Key Generation & Reconstruction: {'PASSED' if test1_passed else 'FAILED'}")
    print(f"✅ In-Memory Generation: {'PASSED' if test2_passed else 'FAILED'}")
    
    if test1_passed and test2_passed:
        print("\n🎉 ALL API TESTS PASSED!")
        print("The crypto configuration fix is working correctly with the API endpoints.")
        print("The 'Reconstructed p does not divide n' error has been resolved!")
    else:
        print("\n❌ Some API tests failed.")
        print("Make sure the Flask server is running and try again.")
