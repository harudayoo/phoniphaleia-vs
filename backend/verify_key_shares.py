# Use this script to verify the key-share storage process
# Run it after the server is running

import json
import logging
import requests
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# API URL
API_URL = "http://localhost:5000/api"  # Change as needed

def login_as_admin():
    """Log in as admin to get a token"""
    email = input("Admin email: ")
    password = input("Admin password: ")
    
    login_res = requests.post(
        f"{API_URL}/auth/admin/login",
        json={"email": email, "password": password}
    )
    
    if not login_res.ok:
        print(f"Login failed: {login_res.text}")
        return None
        
    response = login_res.json()
    return response.get("token")

def main():
    """Main testing function"""
    logger.info("Starting key share storage verification")
    
    # Get admin token
    admin_token = login_as_admin()
    if not admin_token:
        logger.error("Failed to get admin token, exiting")
        sys.exit(1)
    
    # Create election
    election_name = f"Test Election {json.dumps(json.loads(json.dumps({'a': 1})))}"
    election_res = requests.post(
        f"{API_URL}/elections",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        },
        json={
            "org_id": 1,  # Update this to a valid org ID
            "election_name": election_name,
            "election_desc": "Test election for key share storage",
            "election_status": "Draft",
            "date_start": "2025-06-01",
            "date_end": "2025-06-02",
            "queued_access": False
        }
    )
    
    if not election_res.ok:
        logger.error(f"Failed to create election: {election_res.text}")
        sys.exit(1)
    
    election = election_res.json()
    election_id = election.get("election_id")
    logger.info(f"Created election ID: {election_id}")
    
    # Create two trusted authorities
    authorities = []
    for i in range(2):
        auth_res = requests.post(
            f"{API_URL}/trusted_authorities",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "authority_name": f"Test Authority {i+1}",
                "contact_info": f"test{i+1}@example.com"
            }
        )
        
        if not auth_res.ok:
            logger.error(f"Failed to create authority {i+1}: {auth_res.text}")
            continue
        
        authority = auth_res.json()
        authorities.append(authority)
    
    if not authorities:
        logger.error("Failed to create any authorities, exiting")
        sys.exit(1)
    
    logger.info(f"Created {len(authorities)} authorities")
    
    # Generate key pairs
    key_gen_res = requests.post(
        f"{API_URL}/crypto_configs/generate-in-memory",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        },
        json={
            "n_personnel": len(authorities),
            "threshold": len(authorities) // 2 + 1,
            "crypto_method": "paillier"
        }
    )
    
    if not key_gen_res.ok:
        logger.error(f"Failed to generate key pairs: {key_gen_res.text}")
        sys.exit(1)
    
    key_data = key_gen_res.json()
    logger.info(f"Generated {len(key_data.get('private_shares', []))} key pairs")
    
    # Create authority shares mapping
    authority_shares = []
    for i, authority in enumerate(authorities):
        if i < len(key_data.get('private_shares', [])):
            authority_shares.append({
                "authority_id": authority["authority_id"],
                "share_value": key_data["private_shares"][i]
            })
    
    logger.info(f"Created {len(authority_shares)} authority shares mappings")
    
    # Store crypto config with shares
    store_res = requests.post(
        f"{API_URL}/crypto_configs/store-with-shares",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        },
        json={
            "election_id": election_id,
            "public_key": key_data["public_key"],
            "key_type": "paillier",
            "meta_data": key_data.get("meta_data", "{}"),
            "authority_shares": authority_shares
        }
    )
    
    if not store_res.ok:
        logger.error(f"Failed to store crypto config: {store_res.text}")
        sys.exit(1)
    
    store_data = store_res.json()
    logger.info(f"Successfully stored crypto config ID {store_data.get('crypto_id')} with {len(store_data.get('key_shares', []))} key shares")
    
    # Verify key shares
    verify_res = requests.get(
        f"{API_URL}/crypto_configs/check-key-shares-status?election_id={election_id}",
        headers={
            "Authorization": f"Bearer {admin_token}"
        }
    )
    
    if not verify_res.ok:
        logger.error(f"Failed to verify key shares: {verify_res.text}")
        sys.exit(1)
    
    verify_data = verify_res.json()
    key_shares_count = len(verify_data.get('key_shares', []))
    
    if key_shares_count > 0:
        logger.info(f"✅ SUCCESS: Found {key_shares_count} key shares in the database")
        logger.info(f"Key shares: {json.dumps(verify_data.get('key_shares'))}")
        return True
    else:
        logger.error("❌ FAILURE: No key shares found in the database")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
