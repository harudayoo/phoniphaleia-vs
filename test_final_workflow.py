#!/usr/bin/env python3
"""
Final comprehensive test for the complete voter count workflow implementation.
Tests all scenarios including non-queued elections, queued elections, already voted cases,
and email receipt functionality.
"""

import requests
import json
import time
import os
import sys

# API base URL
API_URL = "http://localhost:5000/api"

def print_test(test_name):
    print(f"\n{'='*50}")
    print(f"🧪 {test_name}")
    print('='*50)

def print_result(success, message):
    emoji = "✅" if success else "❌"
    print(f"{emoji} {message}")

def get_election_details(election_id):
    """Get election details including voters_count and queued_access"""
    try:
        response = requests.get(f"{API_URL}/elections")
        elections = response.json()
        for election in elections:
            if election['election_id'] == election_id:
                return election
    except Exception as e:
        print(f"Error getting election details: {e}")
    return None

def test_vote_check(election_id, voter_id):
    """Test vote-check endpoint"""
    try:
        response = requests.post(f"{API_URL}/elections/{election_id}/vote-check", 
                               json={'voter_id': voter_id})
        if response.status_code == 200:
            data = response.json()
            return data.get('unique', False)
        return False
    except Exception as e:
        print(f"Error in vote check: {e}")
        return False

def test_access_check(election_id, voter_id):
    """Test access-check endpoint"""
    try:
        response = requests.post(f"{API_URL}/elections/{election_id}/access-check", 
                               json={'voter_id': voter_id})
        return response.status_code == 200, response.json() if response.status_code == 200 else response.text
    except Exception as e:
        return False, str(e)

def test_leave_voting_session(election_id, voter_id):
    """Test leave_voting_session endpoint"""
    try:
        response = requests.post(f"{API_URL}/elections/{election_id}/leave_voting_session", 
                               json={'voter_id': voter_id})
        return response.status_code == 200, response.json() if response.status_code == 200 else response.text
    except Exception as e:
        return False, str(e)

def test_submit_vote(election_id, voter_id, votes):
    """Test vote submission"""
    try:
        response = requests.post(f"{API_URL}/elections/{election_id}/vote", 
                               json={'student_id': voter_id, 'votes': votes})
        return response.status_code == 200, response.json() if response.status_code == 200 else response.text
    except Exception as e:
        return False, str(e)

def test_send_vote_receipt(election_id, voter_id):
    """Test send vote receipt"""
    try:
        response = requests.post(f"{API_URL}/elections/{election_id}/votes/send-receipt", 
                               json={'student_id': voter_id})
        return response.status_code == 200, response.json() if response.status_code == 200 else response.text
    except Exception as e:
        return False, str(e)

def main():
    print("🚀 Starting Final Workflow Test")
    print("Testing complete voter count workflow implementation")
    
    # Test voters
    test_voters = [
        "2021-03454",  # Primary test voter
        "2021-03455",  # Secondary test voter
        "2021-03456"   # Tertiary test voter
    ]
    
    # Test elections (assuming these exist)
    non_queued_election = 1  # Should have queued_access=false
    queued_election = 2      # Should have queued_access=true (if exists)
    
    # Test 1: Non-Queued Election Complete Workflow
    print_test("Test 1: Non-Queued Election Complete Workflow")
    
    voter1 = test_voters[0]
    election_before = get_election_details(non_queued_election)
    if not election_before:
        print_result(False, "Could not get election details")
        return
        
    print(f"📊 Election {non_queued_election} before test:")
    print(f"   - voters_count: {election_before.get('voters_count', 'N/A')}")
    print(f"   - queued_access: {election_before.get('queued_access', 'N/A')}")
    print(f"   - max_concurrent_voters: {election_before.get('max_concurrent_voters', 'N/A')}")
    
    # Step 1: Check if voter can vote
    can_vote = test_vote_check(non_queued_election, voter1)
    print_result(can_vote, f"Vote check for {voter1}: {'Can vote' if can_vote else 'Cannot vote'}")
    
    if can_vote:
        # Step 2: Access check (should increment voters_count)
        access_success, access_data = test_access_check(non_queued_election, voter1)
        print_result(access_success, f"Access check: {access_data if access_success else 'Failed'}")
        
        if access_success:
            # Check voters_count increased
            election_after_access = get_election_details(non_queued_election)
            expected_count = election_before.get('voters_count', 0) + 1
            actual_count = election_after_access.get('voters_count', 0)
            print_result(actual_count == expected_count, 
                        f"Voters count incremented: {election_before.get('voters_count', 0)} → {actual_count}")
            
            # Step 3: Submit vote (mock vote data)
            mock_votes = [
                {'position_id': 1, 'candidate_id': 2, 'encrypted_vote': 'mock_encrypted_1'},
                {'position_id': 2, 'candidate_id': 4, 'encrypted_vote': 'mock_encrypted_2'}
            ]
            
            vote_success, vote_data = test_submit_vote(non_queued_election, voter1, mock_votes)
            print_result(vote_success, f"Vote submission: {vote_data if vote_success else 'Failed'}")
            
            if vote_success:
                # Step 4: Send vote receipt (should decrement voters_count)
                receipt_success, receipt_data = test_send_vote_receipt(non_queued_election, voter1)
                print_result(receipt_success, f"Vote receipt: {receipt_data if receipt_success else 'Failed'}")
                
                if receipt_success:
                    # Check voters_count decremented
                    election_after_receipt = get_election_details(non_queued_election)
                    expected_final_count = election_before.get('voters_count', 0)
                    actual_final_count = election_after_receipt.get('voters_count', 0)
                    print_result(actual_final_count == expected_final_count, 
                                f"Voters count decremented: {actual_count} → {actual_final_count}")
            else:
                # If vote failed, clean up by leaving session
                leave_success, leave_data = test_leave_voting_session(non_queued_election, voter1)
                print_result(leave_success, f"Cleanup - Leave session: {leave_data if leave_success else 'Failed'}")
    
    # Test 2: Already Voted Scenario
    print_test("Test 2: Already Voted Scenario")
    
    # Try to vote again with same voter
    can_vote_again = test_vote_check(non_queued_election, voter1)
    print_result(not can_vote_again, f"Vote check for already voted user: {'Cannot vote (correct)' if not can_vote_again else 'Can vote (incorrect)'}")
    
    if not can_vote_again:
        # Try access check anyway (should fail)
        access_success, access_data = test_access_check(non_queued_election, voter1)
        print_result(not access_success, f"Access check for already voted user: {'Rejected (correct)' if not access_success else 'Allowed (incorrect)'}")
    
    # Test 3: Exit from Cast Page Scenario
    print_test("Test 3: Exit from Cast Page Scenario")
    
    voter2 = test_voters[1]
    
    # Check if voter2 can vote
    can_vote2 = test_vote_check(non_queued_election, voter2)
    print_result(can_vote2, f"Vote check for {voter2}: {'Can vote' if can_vote2 else 'Cannot vote'}")
    
    if can_vote2:
        # Do access check
        access_success, access_data = test_access_check(non_queued_election, voter2)
        print_result(access_success, f"Access check: {access_data if access_success else 'Failed'}")
        
        if access_success:
            election_before_exit = get_election_details(non_queued_election)
            
            # Simulate user clicking "Return to Elections" (leave without voting)
            leave_success, leave_data = test_leave_voting_session(non_queued_election, voter2)
            print_result(leave_success, f"Leave voting session: {leave_data if leave_success else 'Failed'}")
            
            if leave_success:
                # Check voters_count decremented
                election_after_exit = get_election_details(non_queued_election)
                expected_count = election_before_exit.get('voters_count', 0) - 1
                actual_count = election_after_exit.get('voters_count', 0)
                print_result(actual_count == expected_count, 
                            f"Voters count decremented on exit: {election_before_exit.get('voters_count', 0)} → {actual_count}")
    
    # Test 4: Queued Election (if available)
    print_test("Test 4: Queued Election Test (if available)")
    
    queued_election_data = get_election_details(queued_election)
    if queued_election_data and queued_election_data.get('queued_access'):
        print(f"📊 Queued Election {queued_election}:")
        print(f"   - voters_count: {queued_election_data.get('voters_count', 'N/A')}")
        print(f"   - max_concurrent_voters: {queued_election_data.get('max_concurrent_voters', 'N/A')}")
        
        voter3 = test_voters[2]
        can_vote3 = test_vote_check(queued_election, voter3)
        print_result(can_vote3, f"Vote check for {voter3}: {'Can vote' if can_vote3 else 'Cannot vote'}")
        
        if can_vote3:
            access_success, access_data = test_access_check(queued_election, voter3)
            print_result(access_success, f"Access check: {access_data if access_success else 'Failed'}")
            
            if access_success:
                # Clean up
                leave_success, leave_data = test_leave_voting_session(queued_election, voter3)
                print_result(leave_success, f"Cleanup - Leave session: {leave_data if leave_success else 'Failed'}")
    else:
        print_result(True, "No queued election available for testing (skipped)")
    
    print_test("Test Complete")
    print("✨ All workflow tests completed!")
    print("\n📋 Summary:")
    print("- Non-queued election workflow: Tested")
    print("- Already voted handling: Tested") 
    print("- Exit from cast page: Tested")
    print("- Queued election: Tested (if available)")
    print("\n🎯 Check the results above to ensure all tests passed!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Test failed with error: {e}")
        sys.exit(1)
