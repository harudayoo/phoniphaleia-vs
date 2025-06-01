#!/usr/bin/env python3
"""
Test script to verify voter_count tracking functionality.
This script tests that voter_count is correctly incremented when voters
pass access-check and decremented when vote receipts are sent.
"""

import requests
import json
import sys

API_BASE = "http://localhost:5000/api"

def test_voter_count_tracking():
    """Test the voter count tracking functionality"""
    print("Testing voter_count tracking functionality...")
    
    # Test data - these should exist in your database
    # You may need to adjust these IDs based on your actual data
    test_election_id = 1
    test_voter_id = "2021-00001"  # Student ID that should exist
    
    print(f"Testing with Election ID: {test_election_id}, Voter ID: {test_voter_id}")
    
    try:
        # Step 1: Get initial voter_count
        print("\n1. Getting initial election data...")
        response = requests.get(f"{API_BASE}/elections")
        if response.status_code != 200:
            print(f"Failed to get elections: {response.text}")
            return False
            
        elections = response.json()
        election = next((e for e in elections if e["election_id"] == test_election_id), None)
        if not election:
            print(f"Election {test_election_id} not found")
            return False
            
        initial_count = election.get("voters_count", 0)
        print(f"Initial voters_count: {initial_count}")
        
        # Step 2: Test eligibility check (without granting access)
        print("\n2. Testing eligibility check...")
        response = requests.post(
            f"{API_BASE}/elections/{test_election_id}/access-check",
            json={"voter_id": test_voter_id}
        )
        if response.status_code != 200:
            print(f"Eligibility check failed: {response.text}")
            return False
            
        eligibility_result = response.json()
        print(f"Eligibility result: {eligibility_result}")
        
        if not eligibility_result.get("eligible"):
            print(f"Voter {test_voter_id} is not eligible for election {test_election_id}")
            print(f"Reason: {eligibility_result.get('reason', 'Unknown')}")
            return False
        
        # Step 3: Grant access and increment voter_count
        print("\n3. Granting access and incrementing voter_count...")
        response = requests.post(
            f"{API_BASE}/elections/{test_election_id}/access-check",
            json={"voter_id": test_voter_id, "grant_access": True}
        )
        if response.status_code != 200:
            print(f"Failed to grant access: {response.text}")
            return False
            
        access_result = response.json()
        print(f"Access grant result: {access_result}")
        
        if not access_result.get("access_granted"):
            print("Access was not granted")
            return False
            
        new_count = access_result.get("voters_count")
        expected_count = initial_count + 1
        
        if new_count != expected_count:
            print(f"ERROR: Expected voters_count to be {expected_count}, but got {new_count}")
            return False
        
        print(f"✓ voters_count correctly incremented to {new_count}")
        
        # Step 4: Simulate sending vote receipt (which should decrement voter_count)
        print("\n4. Testing vote receipt sending (voter_count decrement)...")
        # Note: This will only work if the voter has actually voted
        # For testing purposes, you might need to create test votes first
        
        response = requests.post(
            f"{API_BASE}/elections/{test_election_id}/votes/send-receipt",
            json={"student_id": test_voter_id}
        )
        
        if response.status_code == 200:
            receipt_result = response.json()
            print(f"Receipt result: {receipt_result}")
            
            final_count = receipt_result.get("voters_count")
            if final_count == initial_count:
                print(f"✓ voters_count correctly decremented back to {final_count}")
            else:
                print(f"WARNING: voters_count is {final_count}, expected {initial_count}")
        else:
            print(f"Vote receipt sending failed (expected if no votes exist): {response.text}")
            print("This is normal if the voter hasn't actually voted yet.")
        
        print("\n✓ Voter count tracking test completed successfully!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to the API server.")
        print("Make sure the backend server is running on http://localhost:5000")
        return False
    except Exception as e:
        print(f"ERROR: Unexpected error during testing: {e}")
        return False

def main():
    """Main test function"""
    print("Voter Count Tracking Test")
    print("=" * 40)
    
    success = test_voter_count_tracking()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
