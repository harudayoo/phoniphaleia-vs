import requests
import json
import sys

def test_store_crypto_with_shares():
    """
    Test the /crypto_configs/store-with-shares endpoint directly
    """
    base_url = "http://localhost:5000/api"
    admin_token = input("Enter admin token: ")
    
    # First, create an election for testing
    election_res = requests.post(
        f"{base_url}/elections",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        },
        json={
            "org_id": 1,  # Adjust as needed
            "election_name": "Test Election for Crypto",
            "election_desc": "Testing key share storage",
            "election_status": "Draft",
            "date_start": "2025-06-01",
            "date_end": "2025-06-02",
            "queued_access": False
        }
    )
    
    if not election_res.ok:
        print(f"Failed to create test election: {election_res.status_code} {election_res.text}")
        sys.exit(1)
    
    election = election_res.json()
    election_id = election.get("election_id")
    print(f"Created test election with ID: {election_id}")
    
    # Create two test trusted authorities
    authorities = []
    for i in range(2):
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
            print(f"Failed to create trusted authority: {auth_res.status_code} {auth_res.text}")
            sys.exit(1)
        
        authority = auth_res.json()
        authorities.append(authority)
        print(f"Created authority {i+1}: {authority}")
    
    # Generate key pairs
    key_gen_res = requests.post(
        f"{base_url}/crypto_configs/generate-in-memory",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        },
        json={
            "n_personnel": len(authorities),
            "threshold": len(authorities),
            "crypto_method": "paillier"
        }
    )
    
    if not key_gen_res.ok:
        print(f"Failed to generate keys: {key_gen_res.status_code} {key_gen_res.text}")
        sys.exit(1)
    
    key_data = key_gen_res.json()
    print(f"Generated keys: {len(key_data.get('private_shares', []))} private shares")
    
    # Create authority shares mapping
    authority_shares = []
    for i, authority in enumerate(authorities):
        if i < len(key_data.get('private_shares', [])):
            authority_shares.append({
                "authority_id": authority["authority_id"],
                "share_value": key_data["private_shares"][i]
            })
    
    # Store crypto config with shares
    store_res = requests.post(
        f"{base_url}/crypto_configs/store-with-shares",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        },
        json={
            "election_id": election_id,
            "public_key": key_data["public_key"],
            "key_type": "paillier",
            "meta_data": key_data.get("meta_data", "{}"),
            "authority_shares": authority_shares
        }
    )
    
    print("\n--- STORE CRYPTO CONFIG RESPONSE ---")
    print(f"Status: {store_res.status_code}")
    print(f"Headers: {store_res.headers}")
    
    try:
        response_data = store_res.json()
        print(f"Response JSON: {json.dumps(response_data, indent=2)}")
    except:
        print(f"Raw response: {store_res.text}")
    
    if not store_res.ok:
        print("❌ Test FAILED: Couldn't store crypto config with shares")
        sys.exit(1)
    
    # Verify the key shares were stored
    check_res = requests.get(
        f"{base_url}/crypto_configs/check-key-shares-status?election_id={election_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    print("\n--- CHECK KEY SHARES STATUS RESPONSE ---")
    try:
        check_data = check_res.json()
        print(f"Response: {json.dumps(check_data, indent=2)}")
        
        if check_res.ok and check_data.get("key_shares") and len(check_data["key_shares"]) == len(authority_shares):
            print("✅ Test PASSED: Key shares are stored properly")
        else:
            print("❌ Test FAILED: Key shares are not stored correctly")
            
    except:
        print(f"Error parsing response: {check_res.text}")
        print("❌ Test FAILED: Could not verify key shares status")

if __name__ == "__main__":
    test_store_crypto_with_shares()
