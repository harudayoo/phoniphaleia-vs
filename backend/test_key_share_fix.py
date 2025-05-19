#!/usr/bin/env python
"""
Test script to verify the key share storage functionality.
This script tests if key shares are correctly stored in the database
when creating an election.
"""

import sys
import os
import json
import requests
from datetime import datetime, timedelta
import logging
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('key_share_fix_test')

# API URL
API_URL = "http://localhost:5000/api"

def test_key_shares():
    """Test the entire process of creating an election with key shares"""
    
    # Step 1: Get admin token
    admin_token = login_admin()
    if not admin_token:
        logger.error("Admin login failed. Cannot continue.")
        return False

    # Step 2: Create a test organization
    org_id = create_test_organization(admin_token)
    if not org_id:
        logger.error("Organization creation failed. Cannot continue.")
        return False
    
    logger.info(f"Created test organization with ID: {org_id}")

    # Step 3: Create trusted authorities
    authority_ids = create_trusted_authorities(admin_token, num_authorities=3)
    if not authority_ids or len(authority_ids) < 3:
        logger.error("Failed to create enough trusted authorities. Need at least 3.")
        return False
    
    logger.info(f"Created {len(authority_ids)} trusted authorities: {authority_ids}")

    # Step 4: Generate key pairs
    key_data = generate_key_pair(admin_token, len(authority_ids))
    if not key_data:
        logger.error("Failed to generate key pairs.")
        return False

    public_key = key_data.get('public_key')
    private_shares = key_data.get('private_shares', [])
    logger.info(f"Generated {len(private_shares)} private key shares")

    # Step 5: Create election
    election_id = create_election(admin_token, org_id)
    if not election_id:
        logger.error("Election creation failed. Cannot continue.")
        return False
    
    logger.info(f"Created election with ID: {election_id}")

    # Step 6: Create crypto config and store key shares
    crypto_id = store_crypto_config_with_shares(
        admin_token, 
        election_id, 
        public_key, 
        authority_ids, 
        private_shares
    )
    
    if not crypto_id:
        logger.error("Failed to store crypto configuration and key shares.")
        return False
    
    logger.info(f"Successfully stored crypto configuration with ID: {crypto_id}")

    # Step 7: Verify key shares were correctly stored
    key_shares_verified = verify_key_shares(admin_token, election_id)
    if not key_shares_verified:
        logger.error("Key shares verification failed.")
        return False
    
    logger.info("✅ SUCCESS: Key shares storage and verification successful!")
    return True

def login_admin():
    """Login as admin and return token"""
    try:
        credentials = {
            "email": "admin@example.com",  # Replace with your admin credentials
            "password": "adminpassword"    # Replace with your admin password
        }
        
        logger.info("Attempting admin login...")
        
        response = requests.post(f"{API_URL}/auth/admin_login", json=credentials)
        if not response.ok:
            logger.error(f"Admin login failed: {response.status_code}, {response.text}")
            return None
        
        data = response.json()
        token = data.get("token")
        logger.info("Admin login successful")
        return token
    except Exception as e:
        logger.error(f"Error during admin login: {str(e)}")
        logger.error(traceback.format_exc())
        return None

def create_test_organization(token):
    """Create a test organization for the election"""
    try:
        org_data = {
            "name": f"Test Organization {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "college_id": 1  # Assuming college ID 1 exists
        }
        
        logger.info("Creating test organization...")
        
        response = requests.post(
            f"{API_URL}/organizations", 
            json=org_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if not response.ok:
            logger.error(f"Organization creation failed: {response.status_code}, {response.text}")
            return None
        
        data = response.json()
        org_id = data.get("organization_id")
        logger.info(f"Organization created with ID: {org_id}")
        return org_id
    except Exception as e:
        logger.error(f"Error creating organization: {str(e)}")
        return None

def create_trusted_authorities(token, num_authorities=3):
    """Create trusted authorities and return their IDs"""
    try:
        authority_ids = []
        
        logger.info(f"Creating {num_authorities} trusted authorities...")
        
        for i in range(num_authorities):
            authority_data = {
                "authority_name": f"Test Authority {i + 1} - {datetime.now().strftime('%H:%M:%S')}",
                "contact_info": f"authority{i+1}@example.com"
            }
            
            response = requests.post(
                f"{API_URL}/trusted_authorities", 
                json=authority_data,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if not response.ok:
                logger.error(f"Authority creation failed: {response.status_code}, {response.text}")
                continue
            
            data = response.json()
            authority_id = data.get("authority_id")
            authority_ids.append(authority_id)
            logger.info(f"Created authority {i + 1}/{num_authorities} with ID: {authority_id}")
        
        return authority_ids
    except Exception as e:
        logger.error(f"Error creating trusted authorities: {str(e)}")
        return []

def generate_key_pair(token, num_personnel):
    """Generate a key pair for the election"""
    try:
        key_data = {
            "n_personnel": num_personnel, 
            "threshold": num_personnel // 2 + 1,  # Majority threshold
            "crypto_method": "paillier"
        }
        
        logger.info(f"Generating key pair with {num_personnel} personnel and threshold {key_data['threshold']}...")
        
        response = requests.post(
            f"{API_URL}/crypto_configs/generate-keypair", 
            json=key_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if not response.ok:
            logger.error(f"Key pair generation failed: {response.status_code}, {response.text}")
            return None
        
        data = response.json()
        logger.info(f"Generated key pair successfully. Got {len(data.get('private_shares', []))} private shares.")
        return data
    except Exception as e:
        logger.error(f"Error generating key pair: {str(e)}")
        return None

def create_election(token, org_id):
    """Create a test election"""
    try:
        # Set dates for the election (tomorrow and day after)
        start_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        election_data = {
            "org_id": org_id,
            "election_name": f"Test Election {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "election_desc": "Test election for key share storage verification",
            "election_status": "Upcoming",
            "date_start": start_date,
            "date_end": end_date,
            "queued_access": False,
            "candidates": []  # Empty candidates list for simplicity
        }
        
        logger.info("Creating test election...")
        
        response = requests.post(
            f"{API_URL}/elections", 
            json=election_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if not response.ok:
            logger.error(f"Election creation failed: {response.status_code}, {response.text}")
            logger.error(f"Response: {response.text}")
            return None
        
        data = response.json()
        election_id = data.get("election_id")
        logger.info(f"Election created with ID: {election_id}")
        return election_id
    except Exception as e:
        logger.error(f"Error creating election: {str(e)}")
        logger.error(traceback.format_exc())
        return None

def store_crypto_config_with_shares(token, election_id, public_key, authority_ids, private_shares):
    """Store crypto configuration and key shares"""
    try:
        # Only use as many shares as we have authorities
        min_length = min(len(authority_ids), len(private_shares))
        
        # Create authority_shares mapping
        authority_shares = []
        for i in range(min_length):
            authority_shares.append({
                "authority_id": authority_ids[i],
                "share_value": private_shares[i]
            })
        
        logger.info(f"Created {len(authority_shares)} authority share mappings")
        
        # Create metadata
        meta_data = json.dumps({
            "crypto_type": "paillier",
            "n_personnel": len(authority_ids),
            "threshold": len(authority_ids) // 2 + 1,
            "creation_timestamp": datetime.now().isoformat()
        })
        
        # Prepare request body
        request_data = {
            "election_id": election_id,
            "public_key": public_key,
            "key_type": "paillier",
            "meta_data": meta_data,
            "authority_shares": authority_shares
        }
        
        logger.info(f"Storing crypto config for election {election_id} with {len(authority_shares)} shares...")
        
        response = requests.post(
            f"{API_URL}/crypto_configs/store-with-shares", 
            json=request_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if not response.ok:
            logger.error(f"Store crypto config failed: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None
        
        data = response.json()
        crypto_id = data.get("crypto_id")
        key_shares = data.get("key_shares", [])
        logger.info(f"Crypto config stored with ID: {crypto_id}, created {len(key_shares)} key shares")
        return crypto_id
    except Exception as e:
        logger.error(f"Error storing crypto config: {str(e)}")
        logger.error(traceback.format_exc())
        return None

def verify_key_shares(token, election_id):
    """Verify that key shares were correctly stored"""
    try:
        logger.info(f"Verifying key shares for election {election_id}...")
        
        response = requests.get(
            f"{API_URL}/crypto_configs/check-key-shares-status?election_id={election_id}", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if not response.ok:
            logger.error(f"Key shares verification failed: {response.status_code}, {response.text}")
            return False
        
        data = response.json()
        key_shares = data.get("key_shares", [])
        
        if not key_shares:
            logger.error("No key shares found in the verification response")
            return False
        
        logger.info(f"Found {len(key_shares)} key shares in the database")
        
        # Check each share for required fields
        for idx, share in enumerate(key_shares):
            if not share.get("key_share_id") or not share.get("authority_id"):
                logger.error(f"Share #{idx} is missing required fields")
                return False
            
            logger.info(f"Share #{idx}: Authority ID {share.get('authority_id')}, Share length: {share.get('share_value_length')}")
        
        return True
    except Exception as e:
        logger.error(f"Error verifying key shares: {str(e)}")
        return False

if __name__ == "__main__":
    print("⚙️ Running key share storage fix verification test...")
    success = test_key_shares()
    sys.exit(0 if success else 1)
