#!/usr/bin/env python3
"""
Complete Voter Count Flow Test Script

This script tests the entire voter count tracking implementation including:
1. Initial voter_count tracking
2. Access control based on max_concurrent_voters
3. Waitlist functionality when election is full
4. Proper cleanup when voters leave sessions
5. Vote submission and email completion tracking

Run this script to verify the voter count implementation works correctly.
"""

import requests
import json
import time
from typing import Dict, Any

# Configuration
API_BASE_URL = "http://localhost:5000/api"
TEST_ELECTION_ID = 1  # Adjust this to match your test election
TEST_VOTER_IDS = ["test_voter_1", "test_voter_2", "test_voter_3", "test_voter_4"]  # More voters than max_concurrent

def make_request(method: str, endpoint: str, data: Dict[Any, Any] = None) -> Dict[Any, Any]:
    """Make HTTP request and return JSON response"""
    url = f"{API_BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method.upper() == "PUT":
            response = requests.put(url, headers=headers, json=data)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        print(f"{method} {endpoint} -> {response.status_code}")
        if response.content:
            return response.json()
        return {"status_code": response.status_code}
    except Exception as e:
        print(f"Error making request: {e}")
        return {"error": str(e)}

def get_election_details(election_id: int) -> Dict[Any, Any]:
    """Get current election details including voter_count"""
    elections = make_request("GET", "/elections")
    if isinstance(elections, list):
        for election in elections:
            if election.get("election_id") == election_id:
                return election
    return {}

def test_access_check(voter_id: str, election_id: int, grant_access: bool = False) -> Dict[Any, Any]:
    """Test access check endpoint"""
    data = {"voter_id": voter_id}
    if grant_access:
        data["grant_access"] = True
    
    return make_request("POST", f"/elections/{election_id}/access-check", data)

def test_leave_session(voter_id: str, election_id: int) -> Dict[Any, Any]:
    """Test leave voting session endpoint"""
    return make_request("POST", f"/elections/{election_id}/leave_voting_session")

def test_waitlist_join(voter_id: str, election_id: int) -> Dict[Any, Any]:
    """Test joining waitlist"""
    return make_request("POST", f"/elections/{election_id}/waitlist/join", {"voter_id": voter_id})

def test_submit_vote(voter_id: str, election_id: int) -> Dict[Any, Any]:
    """Test vote submission"""
    # Get candidates for this election first
    candidates_data = make_request("GET", f"/elections/{election_id}/candidates")
    if not isinstance(candidates_data, list) or not candidates_data:
        return {"error": "No candidates found"}
    
    # Create a simple vote (select first candidate for each position)
    votes = []
    for position in candidates_data:
        if position.get("candidates") and len(position["candidates"]) > 0:
            votes.append({
                "position_id": position["position_id"],
                "candidate_id": position["candidates"][0]["candidate_id"]
            })
    
    vote_data = {
        "voter_id": voter_id,
        "votes": votes
    }
    
    return make_request("POST", f"/elections/{election_id}/vote", vote_data)

def test_send_receipt(voter_id: str, election_id: int) -> Dict[Any, Any]:
    """Test sending vote receipt (this decrements voter_count)"""
    data = {
        "voter_id": voter_id,
        "voter_email": f"{voter_id}@test.com"
    }
    return make_request("POST", f"/elections/{election_id}/send-receipt", data)

def main():
    print("🧪 Starting Complete Voter Count Flow Test")
    print("=" * 60)
    
    # Step 1: Get initial election state
    print("\n📊 Step 1: Get initial election state")
    initial_election = get_election_details(TEST_ELECTION_ID)
    if not initial_election:
        print("❌ Election not found!")
        return
    
    initial_voter_count = initial_election.get("voters_count", 0)
    max_concurrent = initial_election.get("max_concurrent_voters", 1)
    queued_access = initial_election.get("queued_access", False)
    
    print(f"   Initial voter_count: {initial_voter_count}")
    print(f"   Max concurrent voters: {max_concurrent}")
    print(f"   Queued access enabled: {queued_access}")
    
    # Step 2: Test voter access up to the limit
    print(f"\n🚀 Step 2: Test voter access up to limit ({max_concurrent})")
    active_voters = []
    
    for i in range(max_concurrent):
        voter_id = TEST_VOTER_IDS[i] if i < len(TEST_VOTER_IDS) else f"voter_{i+1}"
        print(f"   Testing access for {voter_id}...")
        
        # Check eligibility first
        access_result = test_access_check(voter_id, TEST_ELECTION_ID)
        if access_result.get("eligible"):
            # Grant access
            grant_result = test_access_check(voter_id, TEST_ELECTION_ID, grant_access=True)
            if grant_result.get("access_granted"):
                active_voters.append(voter_id)
                print(f"   ✅ {voter_id} granted access")
            else:
                print(f"   ❌ {voter_id} access denied: {grant_result}")
        else:
            print(f"   ⚠️ {voter_id} not eligible: {access_result}")
    
    # Check voter count after granting access
    current_election = get_election_details(TEST_ELECTION_ID)
    current_voter_count = current_election.get("voters_count", 0)
    print(f"   Current voter_count: {current_voter_count}")
    print(f"   Active voters: {len(active_voters)}")
    
    # Step 3: Test voter limit enforcement
    if len(TEST_VOTER_IDS) > max_concurrent:
        print(f"\n🚫 Step 3: Test voter limit enforcement")
        overflow_voter = TEST_VOTER_IDS[max_concurrent]
        print(f"   Testing access for {overflow_voter} (should be denied)...")
        
        access_result = test_access_check(overflow_voter, TEST_ELECTION_ID, grant_access=True)
        if access_result.get("status_code") == 429 or not access_result.get("access_granted"):
            print(f"   ✅ {overflow_voter} correctly denied access (election full)")
        else:
            print(f"   ❌ {overflow_voter} incorrectly granted access: {access_result}")
        
        # Test waitlist if queued access is enabled
        if queued_access:
            print(f"   Testing waitlist for {overflow_voter}...")
            waitlist_result = test_waitlist_join(overflow_voter, TEST_ELECTION_ID)
            if waitlist_result.get("status") == "waiting":
                print(f"   ✅ {overflow_voter} added to waitlist")
            else:
                print(f"   ⚠️ Waitlist result: {waitlist_result}")
    
    # Step 4: Test voting process for one voter
    if active_voters:
        print(f"\n🗳️ Step 4: Test complete voting process")
        test_voter = active_voters[0]
        print(f"   Testing complete vote flow for {test_voter}...")
        
        # Submit vote
        vote_result = test_submit_vote(test_voter, TEST_ELECTION_ID)
        if vote_result.get("message") == "Vote submitted successfully":
            print(f"   ✅ Vote submitted for {test_voter}")
            
            # Send receipt (this should decrement voter_count)
            receipt_result = test_send_receipt(test_voter, TEST_ELECTION_ID)
            if "sent successfully" in receipt_result.get("message", ""):
                print(f"   ✅ Receipt sent for {test_voter}")
                active_voters.remove(test_voter)
            else:
                print(f"   ⚠️ Receipt sending failed: {receipt_result}")
        else:
            print(f"   ❌ Vote submission failed: {vote_result}")
    
    # Step 5: Test leave session functionality
    if active_voters:
        print(f"\n🚪 Step 5: Test leave session functionality")
        test_voter = active_voters[0]
        print(f"   Testing leave session for {test_voter}...")
        
        leave_result = test_leave_session(test_voter, TEST_ELECTION_ID)
        if leave_result.get("message") == "Left voting session successfully":
            print(f"   ✅ {test_voter} left session successfully")
            active_voters.remove(test_voter)
        else:
            print(f"   ⚠️ Leave session result: {leave_result}")
    
    # Step 6: Check final state
    print(f"\n📈 Step 6: Check final election state")
    final_election = get_election_details(TEST_ELECTION_ID)
    final_voter_count = final_election.get("voters_count", 0)
    
    print(f"   Initial voter_count: {initial_voter_count}")
    print(f"   Final voter_count: {final_voter_count}")
    print(f"   Expected final count: {len(active_voters)}")
    
    if final_voter_count == len(active_voters):
        print("   ✅ Voter count tracking is working correctly!")
    else:
        print("   ❌ Voter count tracking has issues!")
    
    # Cleanup: Remove remaining active voters
    if active_voters:
        print(f"\n🧹 Cleanup: Removing remaining {len(active_voters)} voters")
        for voter in active_voters:
            leave_result = test_leave_session(voter, TEST_ELECTION_ID)
            print(f"   Removed {voter}: {leave_result.get('message', 'Unknown result')}")
    
    print("\n" + "=" * 60)
    print("🏁 Test completed!")

if __name__ == "__main__":
    main()
