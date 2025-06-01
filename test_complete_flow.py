#!/usr/bin/env python3
"""
Comprehensive test script for voters_count and waitlist functionality
"""

import requests
import json
import time

API_BASE = "http://localhost:5000/api"

def test_voters_count_non_queued():
    """Test voters_count increment/decrement for non-queued election"""
    print("=== Testing Non-Queued Election (voters_count functionality) ===")
    
    election_id = 87
    voter_id = "2021-03043"  # Using real voter ID
    
    # Get initial state
    response = requests.get(f"{API_BASE}/elections")
    elections = response.json()
    election = next((e for e in elections if e['election_id'] == election_id), None)
    
    if not election:
        print(f"Election {election_id} not found!")
        return
        
    initial_voters = election.get('voters_count', 0)
    print(f"Initial voters_count: {initial_voters}")
    
    # Test access check (should increment voters_count)
    print("\n1. Testing access check (should increment voters_count)...")
    access_data = {"voter_id": voter_id, "grant_access": True}
    response = requests.post(
        f"{API_BASE}/elections/{election_id}/access-check",
        json=access_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"   Access granted: {result.get('access_granted')}")
        print(f"   New voters_count: {result.get('voters_count')}")
        
        if result.get('voters_count') == initial_voters + 1:
            print("   ✅ voters_count incremented correctly")
        else:
            print("   ❌ voters_count not incremented properly")
    else:
        print(f"   ❌ Access check failed: {response.text}")
        return
    
    # Test leave voting session (should decrement voters_count)
    print("\n2. Testing leave voting session (should decrement voters_count)...")
    leave_data = {"voter_id": voter_id}
    response = requests.post(
        f"{API_BASE}/elections/{election_id}/leave-voting-session",
        json=leave_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        # Check updated voters_count
        response = requests.get(f"{API_BASE}/elections")
        elections = response.json()
        election_after = next((e for e in elections if e['election_id'] == election_id), None)
        final_voters = election_after.get('voters_count', 0)
        
        print(f"   Final voters_count: {final_voters}")
        if final_voters == initial_voters:
            print("   ✅ voters_count decremented correctly")
        else:
            print("   ❌ voters_count not decremented properly")
    else:
        print(f"   ❌ Leave session failed: {response.text}")

def test_waitlist_flow():
    """Test waitlist functionality for queued election"""
    print("\n=== Testing Queued Election (waitlist + voters_count functionality) ===")
    
    election_id = 90
    voter_id = "2021-03187"  # Using real voter ID
    
    # Get initial state
    response = requests.get(f"{API_BASE}/elections")
    elections = response.json()
    election = next((e for e in elections if e['election_id'] == election_id), None)
    
    if not election:
        print(f"Election {election_id} not found!")
        return
        
    initial_voters = election.get('voters_count', 0)
    print(f"Initial voters_count: {initial_voters}")
    print(f"Max concurrent voters: {election.get('max_concurrent_voters', 1)}")
    print(f"Queued access: {election.get('queued_access', False)}")
    
    # Test 1: Try to access when there's a slot (should increment voters_count)
    print("\n1. Testing direct access when slot available...")
    access_data = {"voter_id": voter_id, "grant_access": True}
    response = requests.post(
        f"{API_BASE}/elections/{election_id}/access-check",
        json=access_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"   Access granted: {result.get('access_granted')}")
        
        if result.get('access_granted'):
            print(f"   New voters_count: {result.get('voters_count')}")
            if result.get('voters_count') == initial_voters + 1:
                print("   ✅ voters_count incremented correctly for queued election")
            else:
                print("   ❌ voters_count not incremented properly")
                
            # Leave the session to free up the slot
            leave_data = {"voter_id": voter_id}
            requests.post(
                f"{API_BASE}/elections/{election_id}/leave-voting-session",
                json=leave_data,
                headers={"Content-Type": "application/json"}
            )
        else:
            print("   Access not granted - election might be full")
    else:
        print(f"   ❌ Access check failed: {response.text}")
    
    # Test 2: Fill the election and test waitlist
    print("\n2. Testing waitlist when election is full...")
      # Fill the election first
    dummy_voters = ["2020-00896", "2020-01367"]  # Using real voter IDs
    for i, dummy_voter in enumerate(dummy_voters):
        access_data = {"voter_id": dummy_voter, "grant_access": True}
        response = requests.post(
            f"{API_BASE}/elections/{election_id}/access-check",
            json=access_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('access_granted'):
                print(f"   Dummy voter {dummy_voter} got access")
                break
            else:
                print(f"   Election full after {i} dummy voters")
                break
      # Now try to access with test voter (should go to waitlist)
    test_voter = "2020-00913"  # Using real voter ID
    access_data = {"voter_id": test_voter, "grant_access": True}
    response = requests.post(
        f"{API_BASE}/elections/{election_id}/access-check",
        json=access_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"   Access granted: {result.get('access_granted')}")
        print(f"   Action: {result.get('action')}")
        
        if result.get('action') == 'redirect_to_waitlist':
            print("   ✅ Voter correctly redirected to waitlist when election full")
        else:
            print("   ❌ Voter not redirected to waitlist")
    
    # Test 3: Exit from waitlist
    print("\n3. Testing exit from waitlist...")
    leave_data = {"voter_id": test_voter}
    response = requests.post(
        f"{API_BASE}/elections/{election_id}/waitlist/leave",
        json=leave_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        print("   ✅ Successfully left waitlist")
    else:
        print(f"   ❌ Failed to leave waitlist: {response.text}")
    
    # Cleanup: Remove dummy voters
    for dummy_voter in dummy_voters:
        leave_data = {"voter_id": dummy_voter}
        requests.post(
            f"{API_BASE}/elections/{election_id}/leave-voting-session",
            json=leave_data,
            headers={"Content-Type": "application/json"}
        )

def test_waitlist_promotion():
    """Test waitlist promotion when slot becomes available"""
    print("\n=== Testing Waitlist Promotion ===")
    
    election_id = 90
    voter1 = "2021-03043"  # Using real voter ID
    voter2 = "2021-03187"  # Using real voter ID
    
    # Step 1: Fill election with voter1
    access_data = {"voter_id": voter1, "grant_access": True}
    response = requests.post(
        f"{API_BASE}/elections/{election_id}/access-check",
        json=access_data,
        headers={"Content-Type": "application/json"}
    )
    
    voter1_active = False
    if response.status_code == 200 and response.json().get('access_granted'):
        voter1_active = True
        print("   Voter1 is actively voting")
    
    # Step 2: Add voter2 to waitlist
    access_data = {"voter_id": voter2, "grant_access": True}
    response = requests.post(
        f"{API_BASE}/elections/{election_id}/access-check",
        json=access_data,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        result = response.json()
        if result.get('action') == 'redirect_to_waitlist':
            print("   Voter2 added to waitlist")
        else:
            print("   Voter2 got direct access (election not full)")
    
    # Step 3: Voter1 leaves, check if voter2 can access
    if voter1_active:
        print("\n   Voter1 leaving session...")
        leave_data = {"voter_id": voter1}
        requests.post(
            f"{API_BASE}/elections/{election_id}/leave-voting-session",
            json=leave_data,
            headers={"Content-Type": "application/json"}
        )
        
        # Now check if voter2 can access
        time.sleep(1)  # Small delay
        access_data = {"voter_id": voter2, "grant_access": True}
        response = requests.post(
            f"{API_BASE}/elections/{election_id}/access-check",
            json=access_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('access_granted'):
                print("   ✅ Voter2 successfully promoted from waitlist")
                
                # Cleanup
                leave_data = {"voter_id": voter2}
                requests.post(
                    f"{API_BASE}/elections/{election_id}/leave-voting-session",
                    json=leave_data,
                    headers={"Content-Type": "application/json"}
                )
            else:
                print("   ❌ Voter2 still can't access after slot opened")

if __name__ == "__main__":
    print("Testing Complete Voters Count and Waitlist Flow\n")
    
    try:
        test_voters_count_non_queued()
        test_waitlist_flow()
        test_waitlist_promotion()
        print("\n=== All Tests Completed ===")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to backend API. Make sure the backend is running on http://localhost:5000")
    except Exception as e:
        print(f"Error: {e}")
