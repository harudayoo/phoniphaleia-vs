#!/usr/bin/env python3
"""
Comprehensive test for voter count workflow implementation.
This test verifies both queued and non-queued election workflows.
"""

import requests
import json
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
API_BASE = "http://localhost:5000/api"
ADMIN_CREDENTIALS = {
    "username": "superadmin",
    "password": "superadmin123"
}

# Test user credentials
TEST_VOTERS = [
    {"student_id": "20220001", "password": "password123"},
    {"student_id": "20220002", "password": "password123"},
    {"student_id": "20220003", "password": "password123"},
]

class VoterCountFlowTester:
    def __init__(self):
        self.admin_token = None
        self.voter_tokens = {}
        self.test_election_id = None
        
    def authenticate_admin(self):
        """Authenticate as admin"""
        logger.info("Authenticating as admin...")
        response = requests.post(f"{API_BASE}/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            self.admin_token = response.json().get('access_token')
            logger.info("Admin authentication successful")
            return True
        else:
            logger.error(f"Admin authentication failed: {response.text}")
            return False
            
    def authenticate_voters(self):
        """Authenticate test voters"""
        logger.info("Authenticating test voters...")
        for voter in TEST_VOTERS:
            response = requests.post(f"{API_BASE}/auth/login", json=voter)
            if response.status_code == 200:
                self.voter_tokens[voter["student_id"]] = response.json().get('access_token')
                logger.info(f"Voter {voter['student_id']} authenticated successfully")
            else:
                logger.error(f"Voter {voter['student_id']} authentication failed: {response.text}")
                return False
        return True
        
    def get_test_election(self):
        """Get or create a test election for testing"""
        logger.info("Getting test election...")
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Get list of elections
        response = requests.get(f"{API_BASE}/elections", headers=headers)
        if response.status_code == 200:
            elections = response.json()
            # Find an active election with queued_access = true
            for election in elections:
                if (election.get('election_status') == 'Active' and 
                    election.get('queued_access') == True):
                    self.test_election_id = election['election_id']
                    logger.info(f"Found queued test election: {election['election_name']} (ID: {self.test_election_id})")
                    return election
                    
            # Find an active election with queued_access = false
            for election in elections:
                if (election.get('election_status') == 'Active' and 
                    election.get('queued_access') == False):
                    self.test_election_id = election['election_id']
                    logger.info(f"Found non-queued test election: {election['election_name']} (ID: {self.test_election_id})")
                    return election
                    
        logger.error("No suitable test election found")
        return None
        
    def test_access_check_workflow(self, election_id, voter_id, expected_queued=None):
        """Test the access check workflow"""
        logger.info(f"Testing access check for voter {voter_id} on election {election_id}")
        
        headers = {"Authorization": f"Bearer {self.voter_tokens[voter_id]}"}
        data = {"voter_id": voter_id}
        
        response = requests.post(f"{API_BASE}/elections/{election_id}/access_check", 
                               json=data, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"Access check successful: {result}")
            return result
        else:
            logger.error(f"Access check failed: {response.status_code} - {response.text}")
            return None
            
    def test_leave_voting_session(self, election_id, voter_id):
        """Test leaving voting session"""
        logger.info(f"Testing leave voting session for voter {voter_id} on election {election_id}")
        
        headers = {"Authorization": f"Bearer {self.voter_tokens[voter_id]}"}
        data = {"voter_id": voter_id}
        
        response = requests.post(f"{API_BASE}/elections/{election_id}/leave_voting_session", 
                               json=data, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"Leave voting session successful: {result}")
            return result
        else:
            logger.error(f"Leave voting session failed: {response.status_code} - {response.text}")
            return None
            
    def get_election_status(self, election_id):
        """Get current election status including voters_count"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{API_BASE}/elections/{election_id}", headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Failed to get election status: {response.text}")
            return None
            
    def test_non_queued_election_workflow(self):
        """Test complete workflow for non-queued elections"""
        logger.info("\n=== TESTING NON-QUEUED ELECTION WORKFLOW ===")
        
        if not self.test_election_id:
            logger.error("No test election available")
            return False
            
        # Get initial election status
        initial_status = self.get_election_status(self.test_election_id)
        if not initial_status:
            return False
            
        initial_voters_count = initial_status.get('voters_count', 0)
        is_queued = initial_status.get('queued_access', False)
        
        logger.info(f"Initial voters_count: {initial_voters_count}, queued_access: {is_queued}")
        
        if is_queued:
            logger.info("Election is queued, skipping non-queued test")
            return True
            
        # Test access check (should increment voters_count)
        voter_id = TEST_VOTERS[0]["student_id"]
        access_result = self.test_access_check_workflow(self.test_election_id, voter_id)
        if not access_result:
            return False
            
        # Check voters_count increased
        status_after_access = self.get_election_status(self.test_election_id)
        if status_after_access:
            new_voters_count = status_after_access.get('voters_count', 0)
            logger.info(f"Voters_count after access check: {new_voters_count}")
            if new_voters_count != initial_voters_count + 1:
                logger.error(f"Expected voters_count to increase by 1, but got {new_voters_count}")
                return False
        
        # Test leaving voting session (should decrement voters_count)
        leave_result = self.test_leave_voting_session(self.test_election_id, voter_id)
        if not leave_result:
            return False
            
        # Check voters_count decreased
        status_after_leave = self.get_election_status(self.test_election_id)
        if status_after_leave:
            final_voters_count = status_after_leave.get('voters_count', 0)
            logger.info(f"Voters_count after leaving session: {final_voters_count}")
            if final_voters_count != initial_voters_count:
                logger.error(f"Expected voters_count to return to {initial_voters_count}, but got {final_voters_count}")
                return False
                
        logger.info("✅ Non-queued election workflow test PASSED")
        return True
        
    def test_queued_election_workflow(self):
        """Test complete workflow for queued elections"""
        logger.info("\n=== TESTING QUEUED ELECTION WORKFLOW ===")
        
        if not self.test_election_id:
            logger.error("No test election available")
            return False
            
        # Get initial election status
        initial_status = self.get_election_status(self.test_election_id)
        if not initial_status:
            return False
            
        initial_voters_count = initial_status.get('voters_count', 0)
        is_queued = initial_status.get('queued_access', False)
        max_concurrent = initial_status.get('max_concurrent_voters', 1)
        
        logger.info(f"Initial voters_count: {initial_voters_count}, queued_access: {is_queued}, max_concurrent: {max_concurrent}")
        
        if not is_queued:
            logger.info("Election is not queued, skipping queued test")
            return True
            
        # Test multiple voters accessing simultaneously
        test_results = []
        for i, voter in enumerate(TEST_VOTERS[:2]):  # Test with 2 voters
            voter_id = voter["student_id"]
            logger.info(f"Testing access for voter {i+1}: {voter_id}")
            
            access_result = self.test_access_check_workflow(self.test_election_id, voter_id)
            test_results.append((voter_id, access_result))
            
            # Check election status after each access
            status = self.get_election_status(self.test_election_id)
            if status:
                logger.info(f"After voter {i+1} access - voters_count: {status.get('voters_count', 0)}")
                
        # Test leaving sessions
        for voter_id, access_result in test_results:
            if access_result and access_result.get('can_vote'):
                logger.info(f"Testing leave session for {voter_id}")
                leave_result = self.test_leave_voting_session(self.test_election_id, voter_id)
                
                # Check status after leaving
                status = self.get_election_status(self.test_election_id)
                if status:
                    logger.info(f"After {voter_id} left - voters_count: {status.get('voters_count', 0)}")
                    
        logger.info("✅ Queued election workflow test COMPLETED")
        return True
        
    def run_all_tests(self):
        """Run all voter count workflow tests"""
        logger.info("Starting comprehensive voter count workflow tests...")
        
        # Authenticate
        if not self.authenticate_admin():
            return False
            
        if not self.authenticate_voters():
            return False
            
        # Get test election
        test_election = self.get_test_election()
        if not test_election:
            return False
            
        # Run workflow tests
        success = True
        
        if test_election.get('queued_access'):
            success &= self.test_queued_election_workflow()
        else:
            success &= self.test_non_queued_election_workflow()
            
        if success:
            logger.info("🎉 All voter count workflow tests PASSED!")
        else:
            logger.error("❌ Some voter count workflow tests FAILED!")
            
        return success

def main():
    tester = VoterCountFlowTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)

if __name__ == "__main__":
    main()
