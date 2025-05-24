#!/usr/bin/env python3
"""
Test crypto operations with proper election creation to avoid foreign key constraint violations.
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

base_url = "http://localhost:5000/api"

def get_admin_token():
    """Get admin authentication token"""
    login_data = {
        "username": "2021-03454",  # Adjust according to your admin credentials
        "password": "HaroldDanielCayan03454"  # Adjust according to your admin password
    }
    
    response = requests.post(f"{base_url}/auth/admin/login", json=login_data)
    if response.status_code == 200:
        return response.json().get("access_token")
    else:
        print(f"Failed to login as admin: {response.status_code} - {response.text}")
        return None

def create_test_election(admin_token):
    """Create a valid test election"""
    print("\n===== Creating Test Election =====")
    
    # Get available organizations
    orgs_res = requests.get(
        f"{base_url}/organizations",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if not orgs_res.ok:
        print(f"Failed to get organizations: {orgs_res.status_code} {orgs_res.text}")
        return None
    
    orgs = orgs_res.json()
    if not orgs:
        print("No organizations found. Creating a default organization...")
        # Create a default organization for testing
        org_data = {
            "org_name": "Test Organization",
            "college_id": 1  # Assuming college ID 1 exists
        }
        org_res = requests.post(
            f"{base_url}/organizations",
            json=org_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if org_res.ok:
            org_id = org_res.json().get("org_id")
        else:
            print(f"Failed to create organization: {org_res.status_code} {org_res.text}")
            return None
    else:
        org_id = orgs[0]["org_id"]  # Use first available organization
    
    # Create election
    current_date = datetime.now().date()
    election_data = {
        "org_id": org_id,
        "election_name": "Test Election for Crypto",
        "election_desc": "Testing crypto operations",
        "election_status": "Upcoming",
        "date_start": current_date.isoformat(),
        "date_end": (current_date + timedelta(days=7)).isoformat(),
        "queued_access": False
    }
    
    election_res = requests.post(
        f"{base_url}/elections",
        json=election_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if election_res.ok:
        election = election_res.json()
        print(f"✅ Created election: {election['election_name']} (ID: {election['election_id']})")
        return election['election_id']
    else:
        print(f"Failed to create election: {election_res.status_code} {election_res.text}")
        return None

def test_crypto_operations_with_valid_election():
    """Test crypto operations using a properly created election"""
    print("\n===== Testing Crypto Operations with Valid Election =====")
    
    # Get admin token
    admin_token = get_admin_token()
    if not admin_token:
        print("❌ Failed to get admin token")
        return False
    
    # Create a valid election
    election_id = create_test_election(admin_token)
    if not election_id:
        print("❌ Failed to create test election")
        return False
    
    try:
        # Test 1: Generate key pair for the valid election
        print(f"\n1. Testing key generation for election {election_id}...")
        key_gen_data = {
            "election_id": election_id,
            "n_personnel": 3
        }
        
        response = requests.post(
            f"{base_url}/crypto_configs/generate",
            json=key_gen_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if not response.ok:
            print(f"❌ Key generation failed: {response.status_code} - {response.text}")
            return False
        
        key_data = response.json()
        print(f"✅ Key generation successful!")
        print(f"   - Public key (n): {key_data['public_key'][:100]}...")
        print(f"   - Generated {len(key_data['private_shares'])} key shares")
        print(f"   - Crypto ID: {key_data['crypto_id']}")
        
        crypto_id = key_data['crypto_id']
        shares = key_data['private_shares']
        
        # Test 2: Test key reconstruction
        print(f"\n2. Testing key reconstruction...")
        reconstruct_data = {
            "crypto_id": crypto_id,
            "shares": shares  # Use all shares for reconstruction
        }
        
        response = requests.post(
            f"{base_url}/election_results/reconstruct_key",
            json=reconstruct_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if not response.ok:
            print(f"❌ Key reconstruction failed: {response.status_code} - {response.text}")
            return False
        
        reconstruct_result = response.json()
        print(f"✅ Key reconstruction successful!")
        print(f"   - Reconstructed private key (p): {reconstruct_result['reconstructed_private_key'][:50]}...")
        
        # Test 3: Test homomorphic encryption/decryption flow
        print(f"\n3. Testing homomorphic operations...")
        
        # Create mock encrypted votes for testing
        from phe import paillier
        public_key_json = json.loads(key_data['public_key'])
        pubkey = paillier.PaillierPublicKey(n=int(public_key_json['n']))
        
        # Create some mock votes (encrypt the number 1 for each vote)
        encrypted_votes = []
        for i in range(5):  # 5 mock votes
            encrypted_vote = pubkey.encrypt(1)
            encrypted_votes.append(str(encrypted_vote.ciphertext()))
        
        print(f"   - Created {len(encrypted_votes)} mock encrypted votes")
        
        # Test homomorphic addition
        total = None
        for enc_vote_str in encrypted_votes:
            enc_vote = paillier.EncryptedNumber(pubkey, int(enc_vote_str), 0)
            if total is None:
                total = enc_vote
            else:
                total = total + enc_vote
        
        print(f"   - Homomorphic sum computed: {str(total.ciphertext())[:50]}...")
        
        # Test decryption with reconstructed key
        privkey_p = int(reconstruct_result['reconstructed_private_key'])
        privkey_q = int(public_key_json['n']) // privkey_p
        privkey = paillier.PaillierPrivateKey(pubkey, privkey_p, privkey_q)
        
        decrypted_total = privkey.decrypt(total)
        print(f"   - Decrypted total: {decrypted_total} (expected: {len(encrypted_votes)})")
        
        if decrypted_total == len(encrypted_votes):
            print("✅ Homomorphic operations working correctly!")
        else:
            print(f"❌ Homomorphic operations failed! Expected {len(encrypted_votes)}, got {decrypted_total}")
            return False
        
        print(f"\n🎉 All crypto operations completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Cleanup: Delete the test election
        try:
            print(f"\n🧹 Cleaning up test election {election_id}...")
            delete_response = requests.delete(
                f"{base_url}/elections/{election_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            if delete_response.ok:
                print("✅ Test election deleted successfully")
            else:
                print(f"⚠️  Warning: Could not delete test election: {delete_response.status_code}")
        except Exception as cleanup_error:
            print(f"⚠️  Warning: Cleanup error: {cleanup_error}")

if __name__ == "__main__":
    print("🚀 Starting comprehensive crypto test with valid election...")
    success = test_crypto_operations_with_valid_election()
    
    if success:
        print("\n✅ All tests passed! The crypto system is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the output above.")
        sys.exit(1)
