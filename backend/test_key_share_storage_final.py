#!/usr/bin/env python
"""
Test script for key share storage functionality.
This script tests the complete flow from generating key shares to storing them in the database.
"""
import os
import sys
import json
import requests
import argparse
from pprint import pprint

# Set up the base URL for API requests
API_URL = "http://localhost:5000/api"

def login_admin(username, password):
    """Get admin token for authentication"""
    try:
        response = requests.post(
            f"{API_URL}/auth/admin_login",
            json={"username": username, "password": password}
        )
        response.raise_for_status()
        data = response.json()
        return data.get("token")
    except Exception as e:
        print(f"Login failed: {e}")
        sys.exit(1)

def create_test_authorities(admin_token, count=3):
    """Create test trusted authorities"""
    authorities = []
    
    for i in range(1, count + 1):
        try:
            response = requests.post(
                f"{API_URL}/trusted_authorities",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"authority_name": f"Test Authority {i}", "contact_info": f"test{i}@example.com"}
            )
            response.raise_for_status()
            authority = response.json()
            authorities.append(authority)
            print(f"Created test authority: {authority['authority_name']} (ID: {authority['authority_id']})")
        except Exception as e:
            print(f"Failed to create test authority {i}: {e}")
    
    return authorities

def generate_test_keypair(admin_token, n_authorities=3):
    """Generate test key pair in memory"""
    try:
        response = requests.post(
            f"{API_URL}/crypto_configs/generate-in-memory",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"n_personnel": n_authorities, "threshold": n_authorities - 1}
        )
        response.raise_for_status()
        data = response.json()
        print(f"Generated key pair with {len(data['private_shares'])} private shares")
        return data
    except Exception as e:
        print(f"Failed to generate test key pair: {e}")
        sys.exit(1)

def create_test_election(admin_token):
    """Create a test election"""
    try:
        response = requests.post(
            f"{API_URL}/elections",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "org_id": 1,  # Assuming org_id 1 exists
                "election_name": "Test Election for Key Share Storage",
                "election_desc": "This is a test election created to verify key share storage",
                "election_status": "Setup",
                "date_start": "2025-06-01",
                "date_end": "2025-06-02"
            }
        )
        response.raise_for_status()
        election = response.json()
        print(f"Created test election: {election['election_name']} (ID: {election['election_id']})")
        return election
    except Exception as e:
        print(f"Failed to create test election: {e}")
        sys.exit(1)

def store_crypto_config_with_shares(admin_token, election_id, public_key, private_shares, authority_ids):
    """Store crypto config with key shares"""
    try:
        # Create authority shares mapping
        authority_shares = []
        for i in range(min(len(private_shares), len(authority_ids))):
            authority_shares.append({
                "authority_id": authority_ids[i],
                "share_value": private_shares[i]
            })
        
        # Create metadata
        metadata = json.dumps({
            "crypto_type": "paillier",
            "n_personnel": len(authority_ids),
            "threshold": len(authority_ids) - 1,
            "creation_timestamp": "2025-01-01T00:00:00Z"  # Test timestamp
        })
        
        # Make the request
        response = requests.post(
            f"{API_URL}/crypto_configs/store-with-shares",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "election_id": election_id,
                "public_key": public_key,
                "key_type": "paillier",
                "meta_data": metadata,
                "authority_shares": authority_shares
            }
        )
        response.raise_for_status()
        result = response.json()
        print(f"Stored crypto config with ID {result['crypto_id']} and {len(result['key_shares'])} key shares")
        return result
    except Exception as e:
        print(f"Failed to store crypto config with shares: {e}")
        if hasattr(e, 'response') and e.response:
            try:
                print(f"Response status: {e.response.status_code}")
                print(f"Response body: {e.response.text}")
            except:
                pass
        sys.exit(1)

def verify_key_shares(admin_token, election_id):
    """Verify key shares were stored correctly"""
    try:
        response = requests.get(
            f"{API_URL}/crypto_configs/check-key-shares-status?election_id={election_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        response.raise_for_status()
        data = response.json()
        
        if not data.get('crypto_config'):
            print("❌ No crypto configuration found for this election.")
            return False
            
        shares = data.get('key_shares', [])
        if not shares:
            print("❌ No key shares found for this election.")
            return False
            
        print(f"✅ Found {len(shares)} key shares for election ID {election_id}")
        
        # Print details about each key share
        for idx, share in enumerate(shares):
            print(f"  Share #{idx}: Authority ID {share['authority_id']}, " 
                  f"Authority Name: {share['authority_name']}, "
                  f"Share Length: {share['share_value_length']}")
        
        return True
    except Exception as e:
        print(f"Failed to verify key shares: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Test key share storage functionality.')
    parser.add_argument('--username', default='admin', help='Admin username')
    parser.add_argument('--password', default='admin', help='Admin password')
    parser.add_argument('--authorities', type=int, default=3, help='Number of test authorities to create')
    args = parser.parse_args()
    
    print("=== Testing Key Share Storage Functionality ===\n")
    
    # Step 1: Login as admin
    print("\n1. Logging in as admin...")
    admin_token = login_admin(args.username, args.password)
    if not admin_token:
        print("❌ Failed to login. Exiting.")
        sys.exit(1)
    print("✅ Logged in successfully.\n")
    
    # Step 2: Create test authorities
    print("\n2. Creating test trusted authorities...")
    authorities = create_test_authorities(admin_token, args.authorities)
    if not authorities:
        print("❌ Failed to create test authorities. Exiting.")
        sys.exit(1)
    authority_ids = [auth['authority_id'] for auth in authorities]
    print(f"✅ Created {len(authorities)} test authorities.\n")
    
    # Step 3: Create test election
    print("\n3. Creating test election...")
    election = create_test_election(admin_token)
    if not election:
        print("❌ Failed to create test election. Exiting.")
        sys.exit(1)
    print("✅ Created test election successfully.\n")
    
    # Step 4: Generate key pair
    print("\n4. Generating key pair...")
    key_data = generate_test_keypair(admin_token, len(authorities))
    if not key_data:
        print("❌ Failed to generate key pair. Exiting.")
        sys.exit(1)
    print("✅ Generated key pair successfully.\n")
    
    # Step 5: Store crypto config with shares
    print("\n5. Storing crypto config with shares...")
    result = store_crypto_config_with_shares(
        admin_token,
        election['election_id'],
        key_data['public_key'],
        key_data['private_shares'],
        authority_ids
    )
    if not result:
        print("❌ Failed to store crypto config with shares. Exiting.")
        sys.exit(1)
    print("✅ Stored crypto config with shares successfully.\n")
    
    # Step 6: Verify key shares
    print("\n6. Verifying key shares...")
    success = verify_key_shares(admin_token, election['election_id'])
    if not success:
        print("❌ Failed to verify key shares. Test failed.")
        sys.exit(1)
    print("✅ Key shares verified successfully.\n")
    
    print("\n=== Test completed successfully! ===")

if __name__ == "__main__":
    main()
