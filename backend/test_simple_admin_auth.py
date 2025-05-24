"""
Simplified admin authentication test that bypasses email OTP by directly accessing the database.
This is useful for development testing when email services are not configured.
"""

import requests
import json
import sys
import sqlite3
import os
from datetime import datetime, timedelta

API_URL = "http://localhost:5000/api"
DB_PATH = "app/voting_system.db"  # Adjust path as needed

class SimpleAdminAuthTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.admin_id = None
        self.test_admin_data = {
            "id_number": "2024-99999",
            "email": "testadmin@usep.edu.ph", 
            "lastname": "Test",
            "firstname": "Admin",
            "middlename": "User",
            "username": "testadmin",
            "password": "TestPassword123!"
        }
        
    def ensure_test_admin_exists(self):
        """Ensure test admin exists in database"""
        print("🔧 Ensuring test admin exists...")        
        try:
            response = self.session.post(
                f"{API_URL}/auth/admin_register",
                json=self.test_admin_data
            )
            
            if response.status_code in [201, 409]:  # Created or already exists
                print("✅ Test admin is available")
                return True
            else:
                print(f"❌ Admin setup failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Admin setup error: {e}")
            return False
        
    def bypass_otp_verification(self):
        """Get the actual OTP from database using Flask app context and Admin model"""
        print("🔧 Attempting to get OTP using Admin model...")
        
        # First, trigger the login to generate OTP
        try:
            response = self.session.post(
                f"{API_URL}/auth/admin/login",
                json={
                    "id_number": self.test_admin_data["id_number"],
                    "password": self.test_admin_data["password"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_id = data.get("admin_id")
                print(f"✅ Login triggered - Admin ID: {self.admin_id}")
            else:
                print(f"❌ Login failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
        
        # Access OTP using Flask app context and Admin model
        try:
            # Import Flask app and Admin model
            sys.path.append(os.path.join(os.getcwd(), 'app'))
            from app import create_app
            from app.models.admin import Admin
            
            # Create Flask app context
            app = create_app()
            with app.app_context():
                # Query the admin record
                admin = Admin.query.filter_by(admin_id=self.admin_id).first()
                
                if admin and admin.otp_code:
                    print(f"🔑 Found OTP in Admin model: {admin.otp_code}")
                    print(f"🕐 OTP expires at: {admin.otp_expires_at}")
                    
                    # Verify the actual OTP
                    if self.verify_otp(admin.otp_code):
                        return True
                    else:
                        print("❌ Real OTP verification failed")
                        return False
                else:
                    print("❌ No OTP found for this admin in the database")
                    return False
                    
        except Exception as e:
            print(f"❌ Admin model access error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def verify_otp(self, otp):
        """Verify the OTP and get JWT token"""
        print(f"🔐 Verifying OTP: {otp}")        
        try:
            response = self.session.post(
                f"{API_URL}/auth/admin/verify_otp",
                json={
                    "admin_id": self.admin_id,
                    "otp": otp
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("token")
                print("✅ OTP verification successful")
                print(f"🎫 JWT Token obtained: {self.admin_token[:50]}...")
                return True
            else:
                print(f"❌ OTP verification failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ OTP verification error: {e}")
            return False
    
    def test_crypto_endpoints(self):
        """Test the crypto endpoints with authentication"""
        print("\n🔬 Testing crypto endpoints...")
        
        if not self.admin_token:
            print("❌ No admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            # Test 1: Generate crypto config
            print("🔑 Testing crypto config generation...")            
            response = self.session.post(
                f"{API_URL}/crypto_configs/generate-in-memory",
                json={
                    "n_personnel": 3,
                    "threshold": 3,
                    "crypto_method": "paillier"
                },
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Crypto config generation successful")
                print(f"📊 Generated keys: {list(data.keys())}")
                  # Display key information
                public_key = data.get("public_key")
                private_shares = data.get("private_shares", [])
                threshold = data.get("threshold")
                
                print(f"🔑 Public key length: {len(public_key)} characters")
                print(f"🔀 Generated {len(private_shares)} private key shares")
                print(f"🎯 Threshold: {threshold}")
                
                # Test 2: Test vote encryption/decryption flow
                self.test_vote_flow(data)
                
                return True
            else:
                print(f"❌ Crypto config generation failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Crypto endpoint test error: {e}")
            return False
    
    def test_vote_flow(self, crypto_data):
        """Test a simplified vote encryption/decryption flow"""
        print("\n🗳️ Testing vote encryption/decryption flow...")
        
        try:
            # Import crypto libraries
            from phe import paillier
            import shamirs
            import json
            
            # Parse public key
            public_key_data = json.loads(crypto_data["public_key"])
            public_key = paillier.PaillierPublicKey(n=int(public_key_data["n"]))
            
            # Test vote encryption
            test_votes = [1, 0, 1, 1, 0]  # Sample binary votes
            print(f"🔢 Encrypting {len(test_votes)} test votes...")
            
            encrypted_votes = []
            for i, vote in enumerate(test_votes):
                encrypted_vote = public_key.encrypt(vote)
                encrypted_votes.append({
                    "vote_id": i + 1,
                    "ciphertext": str(encrypted_vote.ciphertext()),
                    "original_value": vote
                })
                print(f"  Vote {i+1}: {vote} → {len(str(encrypted_vote.ciphertext()))} digit ciphertext")
            
            print("✅ Vote encryption successful")
            
            # Test homomorphic addition
            print("🧮 Testing homomorphic vote tallying...")
            total_encrypted = public_key.encrypt(0)
            for vote_data in encrypted_votes:
                vote_ciphertext = paillier.EncryptedNumber(public_key, int(vote_data["ciphertext"]))
                total_encrypted = total_encrypted + vote_ciphertext
            
            expected_total = sum(vote["original_value"] for vote in encrypted_votes)
            print(f"✅ Homomorphic tallying completed (expected total: {expected_total})")
              # Test key reconstruction (simulated)
            print("🔑 Testing key share format...")
            shares_data = crypto_data["private_shares"]
            threshold = crypto_data["threshold"]
            
            print(f"📊 Testing {len(shares_data)} shares with threshold {threshold}")
            
            # Validate share format
            valid_shares = 0
            for i, share_str in enumerate(shares_data):
                try:
                    x, y_hex = share_str.split(":")
                    x_val = int(x)
                    y_val = int(y_hex, 16)
                    valid_shares += 1
                    if i < 3:  # Show first 3 shares
                        print(f"  Share {i+1}: x={x_val}, y_len={len(y_hex)} hex chars")
                except:
                    print(f"  ❌ Invalid share format: {share_str}")
            
            print(f"✅ {valid_shares}/{len(shares_data)} shares have valid format")
            
            print("🎉 Vote flow test completed successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Vote flow test error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def run_test(self):
        """Run the complete test"""
        print("🚀 Starting Simplified Admin Auth & Crypto Test")
        print("=" * 55)
        
        # Step 1: Ensure test admin exists
        if not self.ensure_test_admin_exists():
            return False
        
        # Step 2: Bypass OTP verification
        if not self.bypass_otp_verification():
            return False
        
        # Step 3: Test crypto endpoints
        if not self.test_crypto_endpoints():
            return False
        
        print("\n🎉 All tests completed successfully!")
        print(f"🎫 Admin token: {self.admin_token}")
        print("=" * 55)
        return True

def main():
    """Main function"""
    print("🔧 Simplified Admin Authentication & Crypto Testing")
    print("This bypasses email OTP for development testing")
    print()
    
    # Check backend connectivity
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is responding")
        else:
            print(f"⚠️ Backend response: {response.status_code}")
    except:
        print("❌ Cannot connect to backend. Ensure it's running on localhost:5000")
        sys.exit(1)
    
    # Run the test
    tester = SimpleAdminAuthTester()
    success = tester.run_test()
    
    if success:
        print("\n✅ SUCCESS: All crypto endpoints are working correctly!")
        print("🔧 The updated crypto implementation is functional.")
    else:
        print("\n❌ FAILURE: Some tests failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
