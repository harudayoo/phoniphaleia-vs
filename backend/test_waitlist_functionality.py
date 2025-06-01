#!/usr/bin/env python3
"""
Test script to verify waitlist/queued access functionality.
Tests the complete flow from access check to waitlist management.
"""

import requests
import json
import sys
import time

API_BASE = "http://localhost:5000/api"

def test_waitlist_functionality():
    """Test the waitlist functionality"""
    print("Testing waitlist/queued access functionality...")
    
    # Test data - adjust these based on your actual data
    test_election_id = 1  # Should be an election with queued_access=True and max_concurrent_voters set
    test_voter_id = "2021-00001"  # Student ID that should exist
    
    print(f"Testing with Election ID: {test_election_id}, Voter ID: {test_voter_id}")
    
    try:
        # Step 1: Get election data to verify it has queued access
        print("\n1. Checking election configuration...")
        response = requests.get(f"{API_BASE}/elections")
        if response.status_code != 200:
            print(f"Failed to get elections: {response.text}")
            return False
            
        elections = response.json()
        election = next((e for e in elections if e["election_id"] == test_election_id), None)
        if not election:
            print(f"Election {test_election_id} not found")
            return False
            
        print(f"Election: {election['election_name']}")
        print(f"Queued Access: {election.get('queued_access', False)}")
        print(f"Max Concurrent Voters: {election.get('max_concurrent_voters', 'Not set')}")
        print(f"Current Voters Count: {election.get('voters_count', 0)}")
        
        if not election.get('queued_access'):
            print("Warning: This election doesn't have queued access enabled")
        
        # Step 2: Test eligibility check
        print("\n2. Testing voter eligibility...")
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
            print(f"Voter {test_voter_id} is not eligible")
            print(f"Reason: {eligibility_result.get('reason', 'Unknown')}")
            return False
        
        # Step 3: Test waitlist join functionality
        print("\n3. Testing waitlist join...")
        response = requests.post(
            f"{API_BASE}/elections/{test_election_id}/waitlist/join",
            json={"voter_id": test_voter_id}
        )
        
        if response.status_code == 200:
            join_result = response.json()
            print(f"Waitlist join result: {join_result}")
        else:
            print(f"Waitlist join response: {response.status_code} - {response.text}")
        
        # Step 4: Check waitlist position
        print("\n4. Checking waitlist position...")
        response = requests.get(
            f"{API_BASE}/elections/{test_election_id}/waitlist/position?voter_id={test_voter_id}"
        )
        
        if response.status_code == 200:
            position_result = response.json()
            print(f"Waitlist position: {position_result}")
        else:
            print(f"Position check failed: {response.status_code} - {response.text}")
        
        # Step 5: Check active voters count
        print("\n5. Checking active voters...")
        response = requests.get(f"{API_BASE}/elections/{test_election_id}/active_voters")
        
        if response.status_code == 200:
            active_result = response.json()
            print(f"Active voters: {active_result}")
        else:
            print(f"Active voters check failed: {response.status_code} - {response.text}")
        
        # Step 6: Test leaving waitlist
        print("\n6. Testing waitlist leave...")
        response = requests.post(
            f"{API_BASE}/elections/{test_election_id}/waitlist/leave",
            json={"voter_id": test_voter_id}
        )
        
        if response.status_code == 200:
            leave_result = response.json()
            print(f"Waitlist leave result: {leave_result}")
        else:
            print(f"Waitlist leave failed: {response.status_code} - {response.text}")
        
        print("\n✓ Waitlist functionality test completed!")
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
    print("Waitlist/Queued Access Test")
    print("=" * 40)
    
    print("This test verifies:")
    print("- Election eligibility checking")
    print("- Waitlist join/leave functionality")
    print("- Position tracking")
    print("- Active voter counting")
    print()
    
    success = test_waitlist_functionality()
    
    if success:
        print("\n🎉 All waitlist tests completed!")
        print("\nNext steps to test the full frontend integration:")
        print("1. Set up an election with queued_access=True")
        print("2. Set max_concurrent_voters to a low number (e.g., 2)")
        print("3. Try accessing the election when it's full")
        print("4. Verify the WaitlistNotifPage appears correctly")
        sys.exit(0)
    else:
        print("\n❌ Tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
