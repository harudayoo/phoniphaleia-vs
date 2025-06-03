#!/usr/bin/env python3
"""
Test script to verify the fixes to homomorphic tallying and decryption.
This script will:
1. Tally an existing election using the improved homomorphic tallying process
2. Verify the tallied results
3. (Optional) Decrypt the results if key shares are available
"""

import sys
import os
import json
import requests
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Config
API_URL = "http://localhost:5000/api"  # Update if your API is running on a different URL

def test_tally_election(election_id):
    """Test the homomorphic tallying process for a specific election"""
    print(f"\n{'='*80}")
    print(f"TESTING HOMOMORPHIC TALLY FOR ELECTION {election_id}")
    print(f"{'='*80}")
    
    # Call the tally endpoint
    try:
        response = requests.post(
            f"{API_URL}/election_results/tally",
            json={"election_id": election_id},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        try:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
            
            if response.status_code == 200:
                print(f"\n✅ Successfully tallied election {election_id}")
                print(f"Total votes processed: {result.get('total_votes_processed', 'N/A')}")
                print(f"Candidates tallied: {result.get('candidates_tallied', 'N/A')}")
                print(f"Results stored: {result.get('results_stored', 'N/A')}")
                return True, result
            else:
                print(f"\n❌ Failed to tally election {election_id}")
                print(f"Error: {result.get('error', 'Unknown error')}")
                return False, result
        except ValueError:
            print(f"Could not parse JSON response: {response.text}")
            return False, None
    except Exception as e:
        print(f"Error making request: {e}")
        return False, None

def test_decrypt_tally(election_id, private_key=None):
    """Test the decryption process for a tallied election"""
    if not private_key:
        print(f"\n⚠️ No private key provided - skipping decryption test")
        return False, None
    
    print(f"\n{'='*80}")
    print(f"TESTING DECRYPTION FOR ELECTION {election_id}")
    print(f"{'='*80}")
    
    # Call the decrypt endpoint
    try:
        response = requests.post(
            f"{API_URL}/election_results/decrypt",
            json={"election_id": election_id, "private_key": private_key},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        try:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
            
            if response.status_code == 200:
                print(f"\n✅ Successfully decrypted election {election_id}")
                print(f"Total decrypted votes: {result.get('total_decrypted_votes', 'N/A')}")
                print(f"Vote count match: {result.get('vote_count_match', {}).get('match', 'N/A')}")
                
                # Print decrypted results
                decrypted = result.get('decrypted_results', {})
                if decrypted:
                    print("\nDecrypted Results:")
                    for candidate_id, vote_count in decrypted.items():
                        print(f"  Candidate {candidate_id}: {vote_count} votes")
                
                return True, result
            else:
                print(f"\n❌ Failed to decrypt election {election_id}")
                print(f"Error: {result.get('error', 'Unknown error')}")
                return False, result
        except ValueError:
            print(f"Could not parse JSON response: {response.text}")
            return False, None
    except Exception as e:
        print(f"Error making request: {e}")
        return False, None

def main():
    """Main test function"""
    if len(sys.argv) < 2:
        print("Usage: python test_homomorphic_tally_fix.py <election_id> [private_key_base64]")
        return
    
    election_id = int(sys.argv[1])
    private_key = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Test tally
    tally_success, tally_result = test_tally_election(election_id)
    
    # Test decrypt if tally was successful and we have a private key
    if tally_success and private_key:
        decrypt_success, decrypt_result = test_decrypt_tally(election_id, private_key)
    
    print(f"\n{'='*80}")
    print(f"TEST SUMMARY FOR ELECTION {election_id}")
    print(f"{'='*80}")
    print(f"Tally Test: {'✅ Passed' if tally_success else '❌ Failed'}")
    if tally_success and private_key:
        print(f"Decrypt Test: {'✅ Passed' if decrypt_success else '❌ Failed'}")

if __name__ == "__main__":
    main()
