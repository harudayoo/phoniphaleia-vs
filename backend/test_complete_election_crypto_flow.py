#!/usr/bin/env python3
"""
Complete Election Crypto Flow Test
This test verifies the entire flow from key generation to storage to reconstruction,
simulating exactly what happens when an election is created in the frontend.
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

class CompleteElectionCryptoTest:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.election_id = None
        self.crypto_id = None
        self.key_gen_result = None
        
    def log(self, message):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def authenticate_admin(self):
        """Authenticate using the same method as test_simple_admin_auth.py"""
        self.log("🔧 Authenticating admin...")
        
        # Test admin data
        test_admin_data = {
            "id_number": "2024-99999",
            "email": "testadmin@usep.edu.ph", 
            "lastname": "Test",
            "firstname": "Admin",
            "middlename": "User",
            "username": "testadmin",
            "password": "TestPassword123!"
        }
        
        # Ensure admin exists
        response = self.session.post(f"{BASE_URL}/api/auth/admin_register", json=test_admin_data)
        if response.status_code not in [201, 409]:
            self.log(f"❌ Admin registration failed: {response.status_code}")
            return False
            
        # Login to trigger OTP
        response = self.session.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={
                "id_number": test_admin_data["id_number"],
                "password": test_admin_data["password"]
            }
        )
        
        if response.status_code != 200:
            self.log(f"❌ Admin login failed: {response.status_code}")
            return False
            
        admin_data = response.json()
        admin_id = admin_data.get("admin_id")
        
        # Get OTP from database using Flask app context
        try:
            from app import create_app
            from app.models.admin import Admin
            
            app = create_app()
            with app.app_context():
                admin = Admin.query.filter_by(admin_id=admin_id).first()
                if admin and admin.otp_code:
                    otp = admin.otp_code
                    self.log(f"🔑 Retrieved OTP: {otp}")
                else:
                    self.log("❌ No OTP found in database")
                    return False
        except Exception as e:
            self.log(f"❌ Database access error: {e}")
            return False
            
        # Verify OTP
        response = self.session.post(
            f"{BASE_URL}/api/auth/admin/verify_otp",
            json={"admin_id": admin_id, "otp": otp}
        )
        
        if response.status_code == 200:
            token_data = response.json()
            self.auth_token = token_data.get("token")
            self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
            self.log("✅ Admin authentication successful")
            return True
        else:
            self.log(f"❌ OTP verification failed: {response.status_code}")
            return False
            
    def step1_generate_keys_in_memory(self):
        """Step 1: Generate cryptographic keys in memory (before election creation)"""
        self.log("📋 STEP 1: Generating keys in memory...")
        
        key_gen_data = {
            "n_personnel": 3,
            "threshold": 2,
            "crypto_method": "paillier",
            "authority_names": ["Authority Alpha", "Authority Beta", "Authority Gamma"]
        }
        
        response = self.session.post(f"{BASE_URL}/api/crypto_configs/generate-in-memory", json=key_gen_data)
        
        if response.status_code != 200:
            self.log(f"❌ Key generation failed: {response.status_code} - {response.text}")
            return False
            
        self.key_gen_result = response.json()
        
        # Verify critical fields
        required_fields = ['public_key', 'authority_shares', 'security_data', 'threshold']
        missing = [f for f in required_fields if f not in self.key_gen_result]
        if missing:
            self.log(f"❌ Missing required fields: {missing}")
            return False
            
        # Verify security_data
        security_data = self.key_gen_result.get('security_data', {})
        critical_fields = ['p', 'prime_modulus', 'n', 'sharing_method']
        missing_critical = [f for f in critical_fields if f not in security_data]
        if missing_critical:
            self.log(f"❌ Missing critical security data: {missing_critical}")
            return False
            
        self.log("✅ Key generation successful")
        self.log(f"   📊 Generated {len(self.key_gen_result['authority_shares'])} authority shares")
        self.log(f"   🔐 Security data keys: {list(security_data.keys())}")
        self.log(f"   🎯 Sharing method: {security_data.get('sharing_method')}")
        self.log(f"   📏 Paillier prime p: {len(security_data['p'])} chars")
        self.log(f"   📏 Shamir modulus: {len(security_data['prime_modulus'])} chars")
        
        return True
        
    def step2_create_election(self):
        """Step 2: Create the election"""
        self.log("🗳️ STEP 2: Creating election...")
        
        # First, get or create a test organization
        org_response = self.session.get(f"{BASE_URL}/api/organizations")
        if org_response.status_code == 200:
            orgs = org_response.json()
            if orgs:
                org_id = orgs[0]['id']  # Use first available organization
                self.log(f"   📊 Using existing organization ID: {org_id}")
            else:
                # Create a test organization
                org_data = {
                    "name": "Test Organization for Crypto Flow",
                    "college_id": 1,  # Assuming college ID 1 exists
                    "description": "Test organization for crypto flow testing"
                }
                org_create_response = self.session.post(f"{BASE_URL}/api/organizations", json=org_data)
                if org_create_response.status_code == 201:
                    org_id = org_create_response.json()['id']
                    self.log(f"   📊 Created new organization ID: {org_id}")
                else:
                    self.log(f"❌ Failed to create organization: {org_create_response.status_code}")
                    return False
        else:
            self.log(f"❌ Failed to get organizations: {org_response.status_code}")
            return False
        
        start_date = (datetime.now() + timedelta(days=1)).date().isoformat()
        end_date = (datetime.now() + timedelta(days=8)).date().isoformat()
        
        election_data = {
            "org_id": org_id,
            "election_name": f"Complete Crypto Flow Test {int(time.time())}",
            "election_desc": "Testing complete crypto flow from generation to reconstruction",
            "election_status": "Upcoming",
            "date_start": start_date,
            "date_end": end_date,
            "queued_access": False,
            "candidates": []
        }
        
        response = self.session.post(f"{BASE_URL}/api/elections", json=election_data)
        
        if response.status_code == 201:
            election_result = response.json()
            self.election_id = election_result.get('election_id')
            self.log(f"✅ Election created with ID: {self.election_id}")
            return True
        else:
            self.log(f"❌ Election creation failed: {response.status_code} - {response.text}")
            return False
            
    def step3_store_crypto_data(self):
        """Step 3: Store crypto data with election (simulating frontend flow)"""
        self.log("💾 STEP 3: Storing crypto data with election...")
        
        if not self.key_gen_result or not self.election_id:
            self.log("❌ Missing key generation result or election ID")
            return False
            
        # Prepare storage data exactly as frontend sends it
        storage_data = {
            "election_id": self.election_id,
            "public_key": self.key_gen_result['public_key'],
            "authority_shares": self.key_gen_result['authority_shares'],
            "threshold": self.key_gen_result['threshold'],
            "security_data": self.key_gen_result['security_data'],
            "crypto_type": "paillier",
            "meta_data": self.key_gen_result.get('meta_data', {})
        }
        
        self.log(f"   📤 Sending storage request with {len(storage_data)} fields")
        self.log(f"   🔐 Security data includes: {list(storage_data['security_data'].keys())}")
        self.log(f"   👥 Authority shares: {len(storage_data['authority_shares'])}")
        
        response = self.session.post(f"{BASE_URL}/api/crypto_configs/store-with-shares", json=storage_data)
        
        if response.status_code == 201:
            storage_result = response.json()
            self.crypto_id = storage_result.get('crypto_id')
            authorities = storage_result.get('authorities', [])
            self.log(f"✅ Crypto data stored successfully")
            self.log(f"   🆔 Crypto ID: {self.crypto_id}")
            self.log(f"   👥 Created {len(authorities)} authority records")
            for auth in authorities:
                self.log(f"      - {auth.get('name')} (ID: {auth.get('id')})")
            return True
        else:
            self.log(f"❌ Crypto storage failed: {response.status_code} - {response.text}")
            return False
            
    def step4_verify_stored_data(self):
        """Step 4: Verify stored data integrity"""
        self.log("🔍 STEP 4: Verifying stored data integrity...")
        
        if not self.crypto_id:
            self.log("❌ No crypto ID for verification")
            return False
            
        # Get stored crypto config
        response = self.session.get(f"{BASE_URL}/api/crypto_configs/election/{self.election_id}")
        
        if response.status_code != 200:
            self.log(f"❌ Failed to retrieve crypto config: {response.status_code}")
            return False
            
        crypto_config = response.json()
        
        try:
            meta_data = json.loads(crypto_config.get('meta_data', '{}'))
        except json.JSONDecodeError:
            self.log("❌ Failed to parse stored metadata")
            return False
            
        # Verify critical data preservation
        original_security = self.key_gen_result['security_data']
        stored_security = meta_data.get('security_data', {})
        
        critical_checks = [
            ("Paillier prime p", meta_data.get('p'), original_security.get('p')),
            ("Shamir modulus", meta_data.get('prime_modulus'), original_security.get('prime_modulus')),
            ("Sharing method", meta_data.get('sharing_method'), original_security.get('sharing_method')),
            ("Public key n", stored_security.get('n'), original_security.get('n'))
        ]
        
        all_good = True
        for check_name, stored_value, original_value in critical_checks:
            if stored_value == original_value:
                self.log(f"   ✅ {check_name}: Correctly preserved")
            else:
                self.log(f"   ❌ {check_name}: Mismatch!")
                self.log(f"      Original: {original_value}")
                self.log(f"      Stored: {stored_value}")
                all_good = False
                
        return all_good
        
    def step5_verify_key_shares(self):
        """Step 5: Verify key shares are stored correctly"""
        self.log("🔑 STEP 5: Verifying key shares storage...")
        
        # Get stored key shares
        response = self.session.get(f"{BASE_URL}/api/key_shares/crypto/{self.crypto_id}")
        
        if response.status_code != 200:
            self.log(f"❌ Failed to retrieve key shares: {response.status_code}")
            return False
            
        stored_shares = response.json()
        original_shares = self.key_gen_result['authority_shares']
        
        if len(stored_shares) != len(original_shares):
            self.log(f"❌ Share count mismatch: stored={len(stored_shares)}, original={len(original_shares)}")
            return False
            
        self.log(f"   ✅ Correct number of shares: {len(stored_shares)}")
        
        # Verify each share
        for i, stored_share in enumerate(stored_shares):
            authority_name = None
            original_share_value = None
            
            # Find matching original share by authority name
            for orig_share in original_shares:
                if orig_share['name'] in [stored_share.get('authority_name', ''), f"Authority {chr(65+i)}"]:
                    authority_name = orig_share['name']
                    original_share_value = orig_share['share']
                    break
                    
            if original_share_value and stored_share['share_value'] == original_share_value:
                self.log(f"   ✅ Share {i+1}: Value correctly preserved")
            else:
                self.log(f"   ❌ Share {i+1}: Value mismatch or not found")
                return False
                
        return True
        
    def step6_test_key_reconstruction(self):
        """Step 6: Test key reconstruction from stored shares"""
        self.log("🔄 STEP 6: Testing key reconstruction...")
        
        # Get key shares for reconstruction
        response = self.session.get(f"{BASE_URL}/api/key_shares/crypto/{self.crypto_id}")
        
        if response.status_code != 200:
            self.log(f"❌ Failed to get shares for reconstruction: {response.status_code}")
            return False
            
        key_shares = response.json()
        
        # Use threshold number of shares (we set threshold=2)
        shares_for_reconstruction = [share['share_value'] for share in key_shares[:2]]
        
        reconstruction_data = {
            "crypto_id": self.crypto_id,
            "shares": shares_for_reconstruction
        }
        
        self.log(f"   🔄 Reconstructing with {len(shares_for_reconstruction)} shares...")
        
        response = self.session.post(f"{BASE_URL}/api/crypto_configs/reconstruct-key", json=reconstruction_data)
        
        if response.status_code != 200:
            self.log(f"❌ Reconstruction failed: {response.status_code} - {response.text}")
            return False
            
        reconstruction_result = response.json()
        
        if not reconstruction_result.get('success'):
            error_msg = reconstruction_result.get('error', 'Unknown error')
            self.log(f"❌ Reconstruction unsuccessful: {error_msg}")
            return False
            
        # Verify reconstruction results
        private_key = reconstruction_result.get('private_key', {})
        reconstructed_p = private_key.get('p')
        reconstructed_q = private_key.get('q')
        public_key_n = reconstruction_result.get('public_key')
        
        if not reconstructed_p or not reconstructed_q:
            self.log("❌ Missing p or q in reconstruction result")
            return False
            
        # Verify p * q = n
        try:
            p_int = int(reconstructed_p)
            q_int = int(reconstructed_q)
            n_int = int(public_key_n)
            
            if p_int * q_int == n_int:
                self.log("   ✅ Reconstruction verification: p * q = n ✓")
            else:
                self.log("   ❌ Reconstruction verification: p * q ≠ n")
                return False
                
        except ValueError as e:
            self.log(f"❌ Failed to verify reconstruction: {e}")
            return False
            
        # Compare with original values
        original_p = self.key_gen_result['security_data']['p']
        if reconstructed_p == original_p:
            self.log("   ✅ Reconstructed p matches original ✓")
        else:
            self.log("   ❌ Reconstructed p does not match original")
            return False
            
        self.log("✅ Key reconstruction fully successful")
        return True
        
    def cleanup(self):
        """Clean up test data"""
        self.log("🧹 Cleaning up test data...")
        
        if self.election_id:
            response = self.session.delete(f"{BASE_URL}/api/elections/{self.election_id}")
            if response.status_code == 200:
                self.log(f"   ✅ Cleaned up election {self.election_id}")
            else:
                self.log(f"   ⚠️ Failed to clean up election: {response.status_code}")
                
    def run_complete_test(self):
        """Run the complete test flow"""
        self.log("🚀 STARTING COMPLETE ELECTION CRYPTO FLOW TEST")
        self.log("=" * 70)
        
        try:
            # Authentication
            if not self.authenticate_admin():
                return False
                
            # Step 1: Generate keys in memory
            if not self.step1_generate_keys_in_memory():
                return False
                
            # Step 2: Create election
            if not self.step2_create_election():
                return False
                
            # Step 3: Store crypto data
            if not self.step3_store_crypto_data():
                return False
                
            # Step 4: Verify stored data
            if not self.step4_verify_stored_data():
                return False
                
            # Step 5: Verify key shares
            if not self.step5_verify_key_shares():
                return False
                
            # Step 6: Test reconstruction
            if not self.step6_test_key_reconstruction():
                return False
                
            self.log("=" * 70)
            self.log("🎉 SUCCESS! COMPLETE ELECTION CRYPTO FLOW WORKING PERFECTLY!")
            self.log("✅ Key generation, storage, and reconstruction all verified")
            self.log("✅ Direct p sharing implementation is fully functional")
            self.log("=" * 70)
            return True
            
        except Exception as e:
            self.log(f"❌ Test failed with exception: {str(e)}")
            import traceback
            self.log(traceback.format_exc())
            return False
        finally:
            self.cleanup()

def main():
    """Main test execution"""
    test = CompleteElectionCryptoTest()
    success = test.run_complete_test()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
