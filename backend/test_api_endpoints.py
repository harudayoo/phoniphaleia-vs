"""
Test script for the crypto_configs/generate API endpoint
This script simulates a request to generate a key pair
"""
import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

def test_generate_temp_election_id():
    """Generate a temporary election ID"""
    try:
        response = requests.get(f"{BASE_URL}/crypto_configs/temp-election-id")
        if response.status_code == 200:
            data = response.json()
            print(f"Temporary election ID generated: {data}")
            return data.get('temp_election_id')
        else:
            print(f"Error generating temporary election ID: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Exception testing temp election ID endpoint: {str(e)}")
        return None

def test_generate_key_pair(election_id=None, crypto_method="threshold_elgamal", n_personnel=3, threshold=2):
    """Test the generate_key_pair endpoint"""
    if election_id is None:
        # Generate a temporary ID if not provided
        election_id = test_generate_temp_election_id()
        if election_id is None:
            return None
            
    print(f"\nTesting key pair generation for election ID: {election_id}")
    try:
        # Create the request data
        data = {
            "election_id": election_id,
            "n_personnel": n_personnel,
            "threshold": threshold,
            "crypto_method": crypto_method
        }
        
        # Make the request
        print(f"Sending request: {json.dumps(data, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/crypto_configs/generate", 
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        # Process the response
        if response.status_code == 201:
            result = response.json()
            print(f"Crypto configuration created successfully.")
            print(f"Crypto ID: {result.get('crypto_id')}")
            print(f"Threshold: {result.get('threshold')}")
            print(f"Key Shares count: {len(result.get('key_shares', []))}")
            return result
        else:
            print(f"Error generating key pair: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"Exception in key generation test: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def test_paillier_key_generation(election_id=None):
    """Test Paillier key generation specifically"""
    return test_generate_key_pair(
        election_id=election_id,
        crypto_method="paillier", 
        n_personnel=5, 
        threshold=3
    )

def test_elgamal_key_generation(election_id=None):
    """Test ElGamal key generation specifically"""
    return test_generate_key_pair(
        election_id=election_id,
        crypto_method="threshold_elgamal", 
        n_personnel=3, 
        threshold=2
    )

if __name__ == "__main__":
    # Test generating a temp election ID
    temp_id = test_generate_temp_election_id()
    
    # Wait a moment to ensure the server has processed the request
    time.sleep(1)
    
    if temp_id:
        # Test both key generation methods
        print("\n--- Testing ElGamal Key Generation ---")
        elgamal_result = test_elgamal_key_generation(temp_id)
        
        # Generate a new temp ID for the Paillier test
        temp_id2 = test_generate_temp_election_id()
        time.sleep(1)
        
        print("\n--- Testing Paillier Key Generation ---")
        paillier_result = test_paillier_key_generation(temp_id2)
        
        if elgamal_result and paillier_result:
            print("\n✅ All tests passed successfully!")
        else:
            print("\n❌ Some tests failed.")
    else:
        print("\n❌ Failed to generate temporary election ID, aborting tests.")
