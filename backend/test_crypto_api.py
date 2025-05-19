"""
Test script for the crypto_configs/generate endpoint to verify key generation
"""
import requests
import json
import sys

def test_generate_keys():
    print("Testing key generation API...")
    
    # First, generate a temporary election ID
    try:
        temp_id_response = requests.get("http://localhost:5000/api/crypto_configs/temp-election-id")
        temp_id_data = temp_id_response.json()
        
        if temp_id_response.status_code != 200:
            print(f"Failed to get temporary election ID: {temp_id_data}")
            return False
            
        temp_election_id = temp_id_data["temp_election_id"]
        print(f"Got temporary election ID: {temp_election_id}")
        
        # Now generate key pair
        payload = {
            "election_id": temp_election_id,
            "n_personnel": 3,
            "threshold": 2,
            "crypto_method": "threshold_elgamal"  # Use threshold ElGamal for testing
        }
        
        print("Sending key generation request...")
        gen_response = requests.post(
            "http://localhost:5000/api/crypto_configs/generate", 
            json=payload
        )
        
        if gen_response.status_code != 201:
            print(f"Key generation failed with status {gen_response.status_code}: {gen_response.text}")
            return False
            
        gen_data = gen_response.json()
        print(f"Key generation successful! Crypto ID: {gen_data.get('crypto_id')}")
        print(f"Public key (excerpt): {str(gen_data.get('public_key'))[:100]}...")
        print(f"Generated {len(gen_data.get('key_shares', []))} key shares")
        
        return True
    except Exception as e:
        print(f"Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    result = test_generate_keys()
    if result:
        print("Test passed successfully!")
        sys.exit(0)
    else:
        print("Test failed!")
        sys.exit(1)
