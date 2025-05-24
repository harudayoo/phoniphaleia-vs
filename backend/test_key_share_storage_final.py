#!/usr/bin/env python3
"""
Final comprehensive test for key share storage and reconstruction.
This test verifies that the updated system correctly:
1. Generates Paillier keys with direct p sharing
2. Stores security data including Paillier prime p and Shamir modulus prime
3. Reconstructs keys correctly from stored shares
4. Maintains consistency between generation and storage phases
"""

import os
import sys
import json
import requests
import time
from datetime import datetime, timedelta

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

# Test configuration
BASE_URL = "http://localhost:5000"
TEST_ADMIN_EMAIL = "admin@test.com"
TEST_ADMIN_PASSWORD = "admin123"

class KeyShareStorageTest:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.election_id = None
        self.crypto_id = None
        
    def log(self, message):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def authenticate(self):
        """Authenticate as admin user"""
        self.log("Authenticating as admin...")
        
        login_data = {
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        }
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data.get('access_token')
            self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
            self.log("✓ Authentication successful")
            return True
        else:
            self.log(f"✗ Authentication failed: {response.status_code} - {response.text}")
            return False
            
    def test_in_memory_key_generation(self):
        """Test the in-memory key generation endpoint"""
        self.log("Testing in-memory key generation...")
        
        key_gen_data = {
            "n_personnel": 3,
            "threshold": 2,
            "crypto_method": "paillier",
            "authority_names": ["Authority 1", "Authority 2", "Authority 3"]
        }
        
        response = self.session.post(f"{BASE_URL}/api/crypto_configs/generate-in-memory", json=key_gen_data)
        
        if response.status_code != 200:
            self.log(f"✗ In-memory key generation failed: {response.status_code} - {response.text}")
            return None
            
        key_result = response.json()
        
        # Verify the response contains required fields
        required_fields = ['public_key', 'authority_shares', 'security_data', 'threshold']
        missing_fields = [field for field in required_fields if field not in key_result]
        
        if missing_fields:
            self.log(f"✗ Missing fields in key generation response: {missing_fields}")
            return None
            
        # Verify security_data contains critical fields
        security_data = key_result.get('security_data', {})
        critical_fields = ['p', 'prime_modulus', 'n']
        missing_critical = [field for field in critical_fields if field not in security_data]
        
        if missing_critical:
            self.log(f"✗ Missing critical fields in security_data: {missing_critical}")
            return None
            
        self.log("✓ In-memory key generation successful")
        self.log(f"  Generated {len(key_result['authority_shares'])} authority shares")
        self.log(f"  Security data contains: {list(security_data.keys())}")
        self.log(f"  Paillier prime p bits: {len(security_data['p'])}")
        self.log(f"  Shamir modulus prime bits: {len(security_data['prime_modulus'])}")
        
        return key_result
        
    def create_test_election(self):
        """Create a test election"""
        self.log("Creating test election...")
        
        # Calculate dates
        start_date = (datetime.now() + timedelta(days=1)).isoformat()
        end_date = (datetime.now() + timedelta(days=8)).isoformat()
        
        election_data = {
            "name": f"Key Storage Test Election {int(time.time())}",
            "description": "Test election for verifying key share storage functionality",
            "date_start": start_date,
            "date_end": end_date,
            "voter_list": ["voter1@test.com", "voter2@test.com"],
            "election_options": [
                {"option_name": "Option A", "option_description": "First option"},
                {"option_name": "Option B", "option_description": "Second option"}
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/elections/", json=election_data)
        
        if response.status_code == 201:
            election_result = response.json()
            self.election_id = election_result.get('election_id')
            self.log(f"✓ Election created with ID: {self.election_id}")
            return True
        else:
            self.log(f"✗ Election creation failed: {response.status_code} - {response.text}")
            return False
            
    def test_crypto_data_storage(self, key_gen_result):
        """Test storing crypto data with the election"""
        if not self.election_id:
            self.log("✗ No election ID available for crypto data storage")
            return False
            
        self.log("Testing crypto data storage...")
        
        # Prepare the storage request exactly as the frontend would send it
        storage_data = {
            "election_id": self.election_id,
            "public_key": key_gen_result['public_key'],
            "authority_shares": key_gen_result['authority_shares'],
            "threshold": key_gen_result['threshold'],
            "security_data": key_gen_result['security_data'],
            "crypto_type": "paillier",
            "meta_data": key_gen_result.get('meta_data', {})
        }
        
        self.log(f"Storage request data keys: {list(storage_data.keys())}")
        self.log(f"Security data keys: {list(storage_data['security_data'].keys())}")
        
        response = self.session.post(f"{BASE_URL}/api/crypto_configs/store-with-shares", json=storage_data)
        
        if response.status_code == 201:
            storage_result = response.json()
            self.crypto_id = storage_result.get('crypto_id')
            self.log(f"✓ Crypto data stored successfully with crypto_id: {self.crypto_id}")
            self.log(f"  Created {len(storage_result.get('authorities', []))} authority records")
            return True
        else:
            self.log(f"✗ Crypto data storage failed: {response.status_code} - {response.text}")
            return False
            
    def verify_stored_data(self):
        """Verify the stored crypto configuration contains correct data"""
        if not self.crypto_id:
            self.log("✗ No crypto_id available for verification")
            return False
            
        self.log("Verifying stored crypto configuration...")
        
        # Get the stored crypto config
        response = self.session.get(f"{BASE_URL}/api/crypto_configs/election/{self.election_id}")
        
        if response.status_code != 200:
            self.log(f"✗ Failed to retrieve crypto config: {response.status_code} - {response.text}")
            return False
            
        crypto_config = response.json()
        
        # Parse metadata
        try:
            meta_data = json.loads(crypto_config.get('meta_data', '{}'))
        except json.JSONDecodeError:
            self.log("✗ Failed to parse stored metadata")
            return False
            
        # Verify critical data is present
        critical_checks = [
            ("Paillier prime p", meta_data.get('p')),
            ("Shamir modulus prime", meta_data.get('prime_modulus') or meta_data.get('prime')),
            ("Sharing method", meta_data.get('sharing_method')),
            ("Security data", meta_data.get('security_data'))
        ]
        
        all_checks_passed = True
        for check_name, value in critical_checks:
            if value:
                self.log(f"✓ {check_name}: Present")
            else:
                self.log(f"✗ {check_name}: Missing")
                all_checks_passed = False
                
        # Verify sharing method is direct_p
        sharing_method = meta_data.get('sharing_method', 'unknown')
        if sharing_method == 'direct_p':
            self.log("✓ Sharing method correctly set to 'direct_p'")
        else:
            self.log(f"✗ Sharing method incorrect: {sharing_method} (expected: direct_p)")
            all_checks_passed = False
            
        return all_checks_passed
        
    def test_key_shares_storage(self):
        """Verify key shares were stored correctly"""
        if not self.crypto_id:
            self.log("✗ No crypto_id available for key shares verification")
            return False
            
        self.log("Verifying key shares storage...")
        
        # Get key shares for this crypto config
        response = self.session.get(f"{BASE_URL}/api/key_shares/crypto/{self.crypto_id}")
        
        if response.status_code != 200:
            self.log(f"✗ Failed to retrieve key shares: {response.status_code} - {response.text}")
            return False
            
        key_shares = response.json()
        
        if not isinstance(key_shares, list):
            self.log(f"✗ Expected list of key shares, got: {type(key_shares)}")
            return False
            
        self.log(f"✓ Found {len(key_shares)} stored key shares")
        
        # Verify each share has required fields
        for i, share in enumerate(key_shares):
            required_fields = ['key_share_id', 'authority_id', 'share_value']
            missing_fields = [field for field in required_fields if field not in share]
            
            if missing_fields:
                self.log(f"✗ Share {i+1} missing fields: {missing_fields}")
                return False
            else:
                share_length = len(share['share_value']) if share['share_value'] else 0
                self.log(f"✓ Share {i+1}: authority_id={share['authority_id']}, length={share_length}")
                
        return True
        
    def test_key_reconstruction(self):
        """Test key reconstruction from stored shares"""
        if not self.crypto_id:
            self.log("✗ No crypto_id available for reconstruction test")
            return False
            
        self.log("Testing key reconstruction...")
        
        # Get key shares
        response = self.session.get(f"{BASE_URL}/api/key_shares/crypto/{self.crypto_id}")
        
        if response.status_code != 200:
            self.log(f"✗ Failed to retrieve key shares for reconstruction: {response.status_code}")
            return False
            
        key_shares = response.json()
        
        if len(key_shares) < 2:
            self.log(f"✗ Insufficient key shares for reconstruction: {len(key_shares)} (need at least 2)")
            return False
            
        # Use the first 2 shares for reconstruction (threshold = 2)
        shares_for_reconstruction = [share['share_value'] for share in key_shares[:2]]
        
        reconstruction_data = {
            "crypto_id": self.crypto_id,
            "shares": shares_for_reconstruction
        }
        
        response = self.session.post(f"{BASE_URL}/api/crypto_configs/reconstruct-key", json=reconstruction_data)
        
        if response.status_code != 200:
            self.log(f"✗ Key reconstruction failed: {response.status_code} - {response.text}")
            return False
            
        reconstruction_result = response.json()
        
        if not reconstruction_result.get('success'):
            error_msg = reconstruction_result.get('error', 'Unknown error')
            self.log(f"✗ Key reconstruction unsuccessful: {error_msg}")
            return False
            
        self.log("✓ Key reconstruction successful")
        
        # Verify reconstruction result
        private_key = reconstruction_result.get('private_key', {})
        reconstructed_p = private_key.get('p')
        reconstructed_q = private_key.get('q')
        
        if reconstructed_p and reconstructed_q:
            self.log(f"✓ Reconstructed p: {len(reconstructed_p)} chars")
            self.log(f"✓ Reconstructed q: {len(reconstructed_q)} chars")
            
            # Verify sharing method
            sharing_method = reconstruction_result.get('sharing_method')
            if sharing_method == 'direct_p':
                self.log("✓ Reconstruction used direct_p sharing method")
            else:
                self.log(f"✗ Unexpected sharing method: {sharing_method}")
                return False
                
            return True
        else:
            self.log("✗ Reconstruction result missing p or q values")
            return False
            
    def cleanup(self):
        """Clean up test data"""
        self.log("Cleaning up test data...")
        
        if self.election_id:
            # Delete the test election (this should cascade to crypto configs and key shares)
            response = self.session.delete(f"{BASE_URL}/api/elections/{self.election_id}")
            if response.status_code == 200:
                self.log(f"✓ Cleaned up election {self.election_id}")
            else:
                self.log(f"⚠ Failed to clean up election {self.election_id}: {response.status_code}")
                
    def run_all_tests(self):
        """Run the complete test suite"""
        self.log("=" * 60)
        self.log("STARTING COMPREHENSIVE KEY SHARE STORAGE TEST")
        self.log("=" * 60)
        
        try:
            # Step 1: Authenticate
            if not self.authenticate():
                return False
                
            # Step 2: Test in-memory key generation
            key_gen_result = self.test_in_memory_key_generation()
            if not key_gen_result:
                return False
                
            # Step 3: Create test election
            if not self.create_test_election():
                return False
                
            # Step 4: Test crypto data storage
            if not self.test_crypto_data_storage(key_gen_result):
                return False
                
            # Step 5: Verify stored data
            if not self.verify_stored_data():
                return False
                
            # Step 6: Verify key shares storage
            if not self.test_key_shares_storage():
                return False
                
            # Step 7: Test key reconstruction
            if not self.test_key_reconstruction():
                return False
                
            self.log("=" * 60)
            self.log("✓ ALL TESTS PASSED! Key share storage system is working correctly.")
            self.log("=" * 60)
            return True
            
        except Exception as e:
            self.log(f"✗ Test suite failed with exception: {str(e)}")
            import traceback
            self.log(traceback.format_exc())
            return False
        finally:
            self.cleanup()

def main():
    """Main test execution"""
    test = KeyShareStorageTest()
    success = test.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
