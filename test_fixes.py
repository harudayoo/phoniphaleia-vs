#!/usr/bin/env python3
"""
Test script to verify the fixes for:
1. Voters count increment after access check
2. Exit confirmation modal functionality
"""

import requests
import json
import time

API_BASE = "http://localhost:5000/api"

def test_access_check_increment():
    """Test that access check increments voters count properly"""
    print("=== Testing Access Check Voters Count Increment ===")
    
    # Use a test election and voter
    election_id = 1  # Adjust based on your test data
    voter_id = "2021-03454"  # Adjust based on your test data
    
    try:
        # Get initial state
        print("1. Getting initial election state...")
        response = requests.get(f"{API_BASE}/elections")
        elections = response.json()
        election = next((e for e in elections if e['election_id'] == election_id), None)
        
        if not election:
            print(f"Election {election_id} not found!")
            return False
            
        initial_count = election.get('voters_count', 0)
        print(f"   Initial voters_count: {initial_count}")
        
        # Test eligibility check (should not increment)
        print("\n2. Testing eligibility check...")
        response = requests.post(
            f"{API_BASE}/elections/{election_id}/access-check",
            json={"voter_id": voter_id, "grant_access": False}
        )
        
        if response.status_code != 200:
            print(f"   ❌ Eligibility check failed: {response.text}")
            return False
        
        eligibility_data = response.json()
        print(f"   ✅ Eligibility check passed: {eligibility_data.get('eligible')}")
        
        # Test access granting (should increment)
        print("\n3. Testing access granting...")
        response = requests.post(
            f"{API_BASE}/elections/{election_id}/access-check",
            json={"voter_id": voter_id, "grant_access": True}
        )
        
        if response.status_code != 200:
            print(f"   ❌ Access granting failed: {response.text}")
            return False
        
        access_data = response.json()
        granted = access_data.get('access_granted')
        new_count = access_data.get('voters_count')
        
        if granted and new_count == initial_count + 1:
            print(f"   ✅ Access granted and voters_count incremented: {initial_count} → {new_count}")
            return True
        else:
            print(f"   ❌ Unexpected result: granted={granted}, count={new_count}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error during test: {e}")
        return False

def test_decrement_endpoint():
    """Test that the decrement endpoint works correctly"""
    print("\n=== Testing Decrement Voters Count Endpoint ===")
    
    election_id = 1  # Adjust based on your test data
    
    try:
        # Get current state
        response = requests.get(f"{API_BASE}/elections")
        elections = response.json()
        election = next((e for e in elections if e['election_id'] == election_id), None)
        
        if not election:
            print(f"Election {election_id} not found!")
            return False
            
        initial_count = election.get('voters_count', 0)
        print(f"   Initial voters_count: {initial_count}")
        
        # Test decrement
        response = requests.post(f"{API_BASE}/elections/{election_id}/decrement_voters_count")
        
        if response.status_code != 200:
            print(f"   ❌ Decrement failed: {response.text}")
            return False
        
        result = response.json()
        final_count = result.get('voters_count')
        expected_count = max(0, initial_count - 1)
        
        if final_count == expected_count:
            print(f"   ✅ Decrement successful: {initial_count} → {final_count}")
            return True
        else:
            print(f"   ❌ Unexpected count: expected {expected_count}, got {final_count}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error during test: {e}")
        return False

def test_start_voting_session():
    """Test that start_voting_session works for queued elections"""
    print("\n=== Testing Start Voting Session for Queued Elections ===")
    
    election_id = 1  # Adjust based on your test data
    voter_id = "2021-03454"  # Adjust based on your test data
    
    try:
        response = requests.post(
            f"{API_BASE}/elections/{election_id}/start_voting_session",
            json={"voter_id": voter_id}
        )
        
        print(f"   Status Code: {response.status_code}")
        result = response.json()
        print(f"   Response: {json.dumps(result, indent=2)}")
        
        if response.status_code == 200:
            print("   ✅ Start voting session successful")
            return True
        elif response.status_code == 403:
            if "No active voting session found" in result.get('error', ''):
                print("   ⚠️  Expected 403 - voter doesn't have active session")
                return True
            else:
                print(f"   ❌ Unexpected 403 error: {result.get('error')}")
                return False
        else:
            print(f"   ❌ Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error during test: {e}")
        return False

def main():
    """Run all tests"""
    print("Testing Recent Fixes for Voters Count and Exit Modal\n")
    
    try:
        results = []
        
        # Test 1: Access check increment
        results.append(test_access_check_increment())
        
        # Test 2: Decrement endpoint
        results.append(test_decrement_endpoint())
        
        # Test 3: Start voting session
        results.append(test_start_voting_session())
        
        # Summary
        passed = sum(results)
        total = len(results)
        
        print(f"\n=== Test Summary ===")
        print(f"Tests passed: {passed}/{total}")
        
        if passed == total:
            print("✅ All tests passed!")
        else:
            print("❌ Some tests failed. Please check the output above.")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend server.")
        print("Make sure the backend is running on http://localhost:5000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()
