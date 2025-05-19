# Testing script for key share storage
# Run this script to test storing crypto configs and key shares

import os
import sys
import json
import requests
from getpass import getpass
from datetime import datetime

base_url = "http://localhost:5000/api"  # Change as needed

def admin_login():
    print("\n===== Admin Login =====")
    email = input("Admin email: ")
    password = getpass("Admin password: ")
    
    login_res = requests.post(
        f"{base_url}/auth/admin/login",
        json={"email": email, "password": password}
    )
    
    if not login_res.ok:
        print(f"Login failed: {login_res.status_code} {login_res.text}")
        sys.exit(1)
        
    token_data = login_res.json()
    return token_data.get("token")

def create_test_election(admin_token):
    print("\n===== Creating Test Election =====")
    
    # Get available organizations
    orgs_res = requests.get(
        f"{base_url}/organizations",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if not orgs_res.ok:
        print(f"Failed to get organizations: {orgs_res.status_code} {orgs_res.text}")
        sys.exit(1)
    
    orgs = orgs_res.json()
    if not orgs:
        print("No organizations found. Please create one first.")
        sys.exit(1)
        
    print("Available organizations:")
    for i, org in enumerate(orgs):
        print(f"{i+1}. {org['name']} (ID: {org['id']})")
    
    org_idx = int(input("Select organization (number): ")) - 1
    org_id = orgs[org_idx]["id"]
    
    # Create election
    current_date = datetime.now().strftime("%Y-%m-%d")
    election_res = requests.post(
        f"{base_url}/elections",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        },
        json={
            "org_id": org_id,
            "election_name": f"Test Election {current_date}",
            "election_desc": "Test election for key share storage",
            "election_status": "Draft",
            "date_start": current_date,
            "date_end": current_date,
            "queued_access": False
        }
    )
    
    if not election_res.ok:
        print(f"Failed to create election: {election_res.status_code} {election_res.text}")
        sys.exit(1)
    
    election = election_res.json()
    print(f"Created election ID: {election['election_id']}")
    return election

def create_trusted_authorities(admin_token, count=3):
    print(f"\n===== Creating {count} Trusted Authorities =====")
    authorities = []
    
    for i in range(count):
        auth_res = requests.post(
            f"{base_url}/trusted_authorities",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {admin_token}"
            },
            json={
                "authority_name": f"Test Authority {i+1}",
                "contact_info": f"test{i+1}@example.com"
            }
        )
        
        if not auth_res.ok:
            print(f"Failed to create authority {i+1}: {auth_res.status_code} {auth_res.text}")
            continue
        
        authority = auth_res.json()
        authorities.append(authority)
        print(f"Created authority: {authority['authority_name']} (ID: {authority['authority_id']})")
    
    return authorities

def generate_key_pairs(admin_token, authorities):
    print("\n===== Generating Key Pairs =====")
    
    key_gen_res = requests.post(
        f"{base_url}/crypto_configs/generate-in-memory",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        },
        json={
            "n_personnel": len(authorities),
            "threshold": (len(authorities) // 2) + 1,
            "crypto_method": "paillier"
        }
    )
    
    if not key_gen_res.ok:
        print(f"Failed to generate keys: {key_gen_res.status_code} {key_gen_res.text}")
        sys.exit(1)
    
    key_data = key_gen_res.json()
    print(f"Generated keys with {len(key_data.get('private_shares', []))} private shares")
    return key_data

def store_crypto_config(admin_token, election, key_data, authorities):
    print("\n===== Storing Crypto Config with Key Shares =====")
    
    # Map private shares to authorities
    authority_shares = []
    for i, authority in enumerate(authorities):
        if i < len(key_data.get('private_shares', [])):
            authority_shares.append({
                "authority_id": authority["authority_id"],
                "share_value": key_data["private_shares"][i]
            })
    
    store_res = requests.post(
        f"{base_url}/crypto_configs/store-with-shares",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        },
        json={
            "election_id": election["election_id"],
            "public_key": key_data["public_key"],
            "key_type": "paillier",
            "meta_data": key_data.get("meta_data", "{}"),
            "authority_shares": authority_shares
        }
    )
    
    print(f"Store API response status: {store_res.status_code}")
    
    try:
        response_data = store_res.json()
        print(f"Response data: {json.dumps(response_data, indent=2)}")
        return store_res.ok, response_data
    except:
        print(f"Raw response: {store_res.text}")
        return store_res.ok, None

def verify_key_shares(admin_token, election_id):
    print(f"\n===== Verifying Key Shares for Election {election_id} =====")
    
    verify_res = requests.get(
        f"{base_url}/crypto_configs/check-key-shares-status?election_id={election_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    print(f"Verification API response status: {verify_res.status_code}")
    
    try:
        verify_data = verify_res.json()
        print(f"Verification data: {json.dumps(verify_data, indent=2)}")
        
        if verify_res.ok and verify_data.get("key_shares") and len(verify_data["key_shares"]) > 0:
            print(f"✅ SUCCESS: {len(verify_data['key_shares'])} key shares found in database")
            return True
        else:
            print("❌ FAILURE: No key shares found in database")
            return False
    except:
        print(f"Raw response: {verify_res.text}")
        return False

def main():
    print("===== Key Share Storage Test =====")
    admin_token = admin_login()
    
    # Create test election
    election = create_test_election(admin_token)
    
    # Create trusted authorities
    authorities = create_trusted_authorities(admin_token, count=3)
    if not authorities:
        print("Failed to create any trusted authorities")
        sys.exit(1)
    
    # Generate key pairs
    key_data = generate_key_pairs(admin_token, authorities)
    
    # Store crypto config with key shares
    success, store_data = store_crypto_config(admin_token, election, key_data, authorities)
    
    if not success:
        print("Failed to store crypto configuration with key shares")
        sys.exit(1)
    
    # Verify key shares
    verified = verify_key_shares(admin_token, election["election_id"])
    
    if verified:
        print("\n✅ TEST PASSED: Key shares were successfully stored and verified")
    else:
        print("\n❌ TEST FAILED: Key shares verification failed")

if __name__ == "__main__":
    main()
