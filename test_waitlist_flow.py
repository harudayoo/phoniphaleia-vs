#!/usr/bin/env python3
"""
Test script to verify the waitlist flow is working correctly.
This script tests the complete flow from access-check to waitlist join.
"""

import requests
import json

API_URL = "http://localhost:5000/api"

def test_waitlist_flow():
    print("🧪 Testing Waitlist Flow for Election 90")
    print("=" * 50)
    
    # Test voter ID from database
    voter_id = "2021-03187"
    election_id = 90
    
    print(f"Testing with voter: {voter_id}")
    print(f"Testing with election: {election_id}")
    print()
    
    # Step 1: Check voter eligibility
    print("Step 1: Checking voter eligibility...")
    eligibility_response = requests.post(
        f"{API_URL}/elections/{election_id}/access-check",
        json={"voter_id": voter_id}
    )
    
    if eligibility_response.status_code == 200:
        eligibility_data = eligibility_response.json()
        print(f"✅ Eligibility Response: {eligibility_data}")
        
        if eligibility_data.get('eligible'):
            print("✅ Voter is eligible!")
        else:
            print(f"❌ Voter is not eligible: {eligibility_data.get('reason')}")
            return
    else:
        print(f"❌ Eligibility check failed: {eligibility_response.status_code}")
        return
    
    print()
    
    # Step 2: Check election status
    print("Step 2: Checking election status...")
    elections_response = requests.get(f"{API_URL}/elections")
    
    if elections_response.status_code == 200:
        elections = elections_response.json()
        election = next((e for e in elections if e['election_id'] == election_id), None)
        
        if election:
            print(f"Election found: {election['election_name']}")
            print(f"Queued access: {election.get('queued_access')}")
            print(f"Max concurrent voters: {election.get('max_concurrent_voters')}")
            print(f"Current voters count: {election.get('voters_count')}")
            
            # Check if election is full
            current_count = election.get('voters_count', 0)
            max_voters = election.get('max_concurrent_voters', 1)
            is_full = current_count >= max_voters
            
            print(f"Election is full: {is_full}")
        else:
            print(f"❌ Election {election_id} not found")
            return
    else:
        print(f"❌ Elections fetch failed: {elections_response.status_code}")
        return
    
    print()
    
    # Step 3: Try to join waitlist (if election is full)
    if is_full and election.get('queued_access'):
        print("Step 3: Trying to join waitlist...")
        waitlist_response = requests.post(
            f"{API_URL}/elections/{election_id}/waitlist/join",
            json={"voter_id": voter_id}
        )
        
        if waitlist_response.status_code == 200:
            waitlist_data = waitlist_response.json()
            print(f"✅ Waitlist Response: {waitlist_data}")
            
            if waitlist_data.get('status') == 'waiting':
                print(f"✅ Successfully added to waitlist at position {waitlist_data.get('position')}")
                print("🎯 This should trigger WaitlistNotifPage in the frontend!")
            else:
                print(f"⚠️ Unexpected waitlist status: {waitlist_data.get('status')}")
        else:
            print(f"❌ Waitlist join failed: {waitlist_response.status_code}")
            try:
                error_data = waitlist_response.json()
                print(f"Error details: {error_data}")
            except:
                print(f"Error text: {waitlist_response.text}")
    else:
        print("Step 3: Election not full or doesn't use queued access - would grant immediate access")
    
    print()
    print("🏁 Test Complete!")
    print()
    print("Expected Frontend Behavior:")
    print("1. User accesses /user/votes/access-check?election_id=90")
    print("2. Frontend detects eligible voter + full election")
    print("3. Frontend adds user to waitlist")
    print("4. Frontend shows WaitlistNotifPage (NOT NotVerifiedPage)")
    print("5. WaitlistNotifPage shows eligibility confirmation + wait message")

if __name__ == "__main__":
    try:
        test_waitlist_flow()
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
