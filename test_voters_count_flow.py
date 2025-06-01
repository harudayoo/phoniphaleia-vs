#!/usr/bin/env python3
"""
Test script to verify voters_count increment functionality
"""

import requests
import json

API_BASE = "http://localhost:5000/api"

def test_non_queued_election():
    """Test voters_count increment for non-queued election"""
    print("=== Testing Non-Queued Election (Election 87) ===")
    
    # Get current state
    response = requests.get(f"{API_BASE}/elections")
    elections = response.json()
    election_87 = next((e for e in elections if e['election_id'] == 87), None)
    
    if not election_87:
        print("Election 87 not found!")
        return
        
    print(f"Before access check:")
    print(f"  - Voters Count: {election_87.get('voters_count', 0)}")
    print(f"  - Max Concurrent: {election_87.get('max_concurrent_voters', 1)}")
    print(f"  - Queued Access: {election_87.get('queued_access', False)}")
    
    # Test access check with grant_access=True
    access_data = {
        "voter_id": "12345",  # Using a test voter ID
        "grant_access": True
    }
    
    response = requests.post(
        f"{API_BASE}/elections/87/access-check",
        json=access_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"\nAccess check response ({response.status_code}):")
    if response.status_code == 200:
        result = response.json()
        print(json.dumps(result, indent=2))
        
        # Check updated voters_count
        response = requests.get(f"{API_BASE}/elections")
        elections = response.json()
        election_87_after = next((e for e in elections if e['election_id'] == 87), None)
        print(f"\nAfter access check:")
        print(f"  - Voters Count: {election_87_after.get('voters_count', 0)}")
    else:
        print(f"Error: {response.text}")

def test_queued_election():
    """Test waitlist system for queued election"""
    print("\n=== Testing Queued Election (Election 90) ===")
    
    # Get current state
    response = requests.get(f"{API_BASE}/elections")
    elections = response.json()
    election_90 = next((e for e in elections if e['election_id'] == 90), None)
    
    if not election_90:
        print("Election 90 not found!")
        return
        
    print(f"Before access check:")
    print(f"  - Voters Count: {election_90.get('voters_count', 0)}")
    print(f"  - Max Concurrent: {election_90.get('max_concurrent_voters', 1)}")
    print(f"  - Queued Access: {election_90.get('queued_access', False)}")
    
    # Check active voters
    response = requests.get(f"{API_BASE}/elections/90/active_voters")
    if response.status_code == 200:
        active_data = response.json()
        print(f"  - Active Voters (waitlist): {active_data.get('active_voters', 0)}")
    
    # Test access check with grant_access=True
    access_data = {
        "voter_id": "12345",  # Using a test voter ID
        "grant_access": True
    }
    
    response = requests.post(
        f"{API_BASE}/elections/90/access-check",
        json=access_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"\nAccess check response ({response.status_code}):")
    if response.status_code == 200:
        result = response.json()
        print(json.dumps(result, indent=2))
        
        # Check updated active voters
        response = requests.get(f"{API_BASE}/elections/90/active_voters")
        if response.status_code == 200:
            active_data = response.json()
            print(f"\nAfter access check:")
            print(f"  - Active Voters (waitlist): {active_data.get('active_voters', 0)}")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    print("Testing Voters Count Increment Functionality\n")
    
    try:
        test_non_queued_election()
        test_queued_election()
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to backend API. Make sure the backend is running on http://localhost:5000")
    except Exception as e:
        print(f"Error: {e}")
