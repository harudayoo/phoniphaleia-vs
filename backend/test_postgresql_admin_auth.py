#!/usr/bin/env python3
"""
PostgreSQL Admin Authentication Test Script
==========================================

This script tests admin authentication directly with PostgreSQL database
without requiring environment variables that cause app initialization issues.

Usage:
    python test_postgresql_admin_auth.py [--create-admin] [--test-settings] [--test-api]
    
Options:
    --create-admin   Create a test admin account
    --test-settings  Test system settings CRUD operations
    --test-api      Test API endpoints (requires Flask server running)
"""

import sys
import os
import argparse
import json
from datetime import datetime, timedelta

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set required environment variables before importing Flask app
os.environ.setdefault('SESSION_TIMEOUT_MINUTES', '30')
os.environ.setdefault('SECRET_KEY', 'dev-secret-key-for-testing')
os.environ.setdefault('JWT_SECRET_KEY', 'dev-jwt-secret-for-testing')
os.environ.setdefault('DATABASE_URL', 'postgresql://postgres:admin@localhost:5432/phoniphaleia-voting')

from werkzeug.security import generate_password_hash, check_password_hash
import jwt

# Import the existing Flask app and database instance
from app import create_app, db
from app.models.admin import Admin
from app.models.system_settings import SystemSettings

# Create app instance
app = create_app()

def create_test_admin():
    """Create a test admin account directly in PostgreSQL"""
    print("👤 Creating test admin account...")
    
    test_admin_data = {
        "id_number": "2024-99999",
        "email": "testadmin@usep.edu.ph",
        "lastname": "Test",
        "firstname": "Admin",
        "middlename": "System",
        "username": "testadmin",
        "password": "TestAdmin123!"
    }
    
    try:
        with app.app_context():
            # Check if test admin exists
            existing_admin = Admin.query.filter_by(id_number=test_admin_data["id_number"]).first()
            if existing_admin:
                print(f"✅ Test admin already exists: {existing_admin.email}")
                return existing_admin
                
            # Create new test admin
            admin = Admin(
                id_number=test_admin_data["id_number"],
                email=test_admin_data["email"],
                lastname=test_admin_data["lastname"],
                firstname=test_admin_data["firstname"],
                middlename=test_admin_data["middlename"],
                username=test_admin_data["username"]
            )
            admin.password_raw = test_admin_data["password"]
            
            db.session.add(admin)
            db.session.commit()
            
            print(f"✅ Created test admin: {admin.email}")
            print(f"🔑 Login credentials:")
            print(f"   - ID Number: {test_admin_data['id_number']}")
            print(f"   - Password: {test_admin_data['password']}")
            print(f"   - Email: {test_admin_data['email']}")
            return admin
            
    except Exception as e:
        print(f"❌ Error creating test admin: {str(e)}")
        if 'db' in locals():
            db.session.rollback()
        return None

def test_admin_authentication():
    """Test admin authentication flow directly with database"""
    print("\n🔐 Testing admin authentication flow...")
    
    test_credentials = {
        "id_number": "2024-99999",
        "password": "TestAdmin123!"
    }
    
    try:
        with app.app_context():
            # Step 1: Find admin by ID number
            print("🔍 Step 1: Finding admin by ID number...")
            admin = Admin.query.filter_by(id_number=test_credentials["id_number"]).first()
            
            if not admin:
                print(f"❌ Admin not found with ID: {test_credentials['id_number']}")
                return False
                
            print(f"✅ Found admin: {admin.email}")
            
            # Step 2: Verify password
            print("🔑 Step 2: Verifying password...")
            if not admin.verify_password(test_credentials["password"]):
                print("❌ Password verification failed")
                return False
                
            print("✅ Password verified successfully")
            
            # Step 3: Generate OTP
            print("📱 Step 3: Generating OTP...")
            otp = admin.generate_otp()
            print(f"✅ Generated OTP: {otp}")
            
            # Step 4: Verify OTP
            print("✅ Step 4: Verifying OTP...")
            if not admin.verify_otp(otp):
                print("❌ OTP verification failed")
                return False
                
            print("✅ OTP verified successfully")
            
            # Step 5: Generate JWT token
            print("🎫 Step 5: Generating JWT token...")
            token_payload = {
                'admin_id': admin.id,
                'id_number': admin.id_number,
                'email': admin.email,
                'exp': datetime.utcnow() + timedelta(hours=24)
            }
            
            token = jwt.encode(
                token_payload,
                app.config['JWT_SECRET_KEY'],
                algorithm='HS256'
            )
            
            print(f"✅ Generated JWT token: {token[:50]}...")
            
            # Step 6: Verify JWT token
            print("🔍 Step 6: Verifying JWT token...")
            try:
                decoded_payload = jwt.decode(
                    token,
                    app.config['JWT_SECRET_KEY'],
                    algorithms=['HS256']
                )
                print(f"✅ Token verified - Admin ID: {decoded_payload['admin_id']}")
            except jwt.ExpiredSignatureError:
                print("❌ Token expired")
                return False
            except jwt.InvalidTokenError:
                print("❌ Invalid token")
                return False
                
            return True
            
    except Exception as e:
        print(f"❌ Authentication test error: {str(e)}")
        return False

def test_system_settings_crud():
    """Test system settings CRUD operations"""
    print("\n🛠️ Testing system settings CRUD operations...")
    
    try:
        with app.app_context():
            # Test 1: Create a test setting
            print("📝 Test 1: Creating test setting...")
            test_setting = SystemSettings(
                category='test',
                setting_key='test_setting',
                description='Test setting for authentication script'
            )
            test_setting.set_typed_value('test_value')
            
            db.session.add(test_setting)
            db.session.commit()
            print("✅ Test setting created")
            
            # Test 2: Read the setting
            print("📖 Test 2: Reading test setting...")
            retrieved_setting = SystemSettings.query.filter_by(
                category='test',
                setting_key='test_setting'
            ).first()
            
            if not retrieved_setting:
                print("❌ Failed to retrieve test setting")
                return False
                
            value = retrieved_setting.get_typed_value()
            print(f"✅ Retrieved setting value: {value}")
            
            # Test 3: Update the setting
            print("✏️ Test 3: Updating test setting...")
            retrieved_setting.set_typed_value('updated_test_value')
            db.session.commit()
            
            updated_setting = SystemSettings.query.filter_by(
                category='test',
                setting_key='test_setting'
            ).first()
            
            updated_value = updated_setting.get_typed_value()
            if updated_value != 'updated_test_value':
                print(f"❌ Update failed. Expected 'updated_test_value', got '{updated_value}'")
                return False
                
            print("✅ Setting updated successfully")
            
            # Test 4: Get settings by category
            print("📁 Test 4: Getting settings by category...")
            category_settings = SystemSettings.get_by_category('test')
            print(f"✅ Found {len(category_settings)} settings in 'test' category")
            
            # Test 5: Delete the test setting
            print("🗑️ Test 5: Deleting test setting...")
            db.session.delete(retrieved_setting)
            db.session.commit()
            
            deleted_check = SystemSettings.query.filter_by(
                category='test',
                setting_key='test_setting'
            ).first()
            
            if deleted_check:
                print("❌ Failed to delete test setting")
                return False
                
            print("✅ Test setting deleted successfully")
            
            return True
            
    except Exception as e:
        print(f"❌ System settings test error: {str(e)}")
        if 'db' in locals():
            db.session.rollback()
        return False

def test_api_endpoints():
    """Test API endpoints with authentication"""
    print("\n🌐 Testing API endpoints...")
    
    import requests
    
    API_URL = "http://localhost:5000/api"
    test_credentials = {
        "id_number": "2024-99999",
        "password": "TestAdmin123!"
    }
    
    session = requests.Session()
    
    try:
        # Step 1: Admin login
        print("🔐 Step 1: Testing admin login endpoint...")
        login_response = session.post(
            f"{API_URL}/auth/admin/login",
            json=test_credentials,
            timeout=10
        )
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return False
            
        login_data = login_response.json()
        admin_id = login_data.get("admin_id")
        print(f"✅ Login successful - Admin ID: {admin_id}")
        
        # Step 2: Get OTP from database
        print("🔑 Step 2: Getting OTP from database...")
        with app.app_context():
            admin = Admin.query.get(admin_id)
            if not admin or not admin.otp_code:
                print("❌ No OTP found in database")
                return False
                
            otp = admin.otp_code
            print(f"✅ Retrieved OTP: {otp}")
        
        # Step 3: Verify OTP
        print("✅ Step 3: Testing OTP verification endpoint...")
        otp_response = session.post(
            f"{API_URL}/auth/admin/verify_otp",
            json={
                "admin_id": admin_id,
                "otp": otp
            },
            timeout=10
        )
        
        if otp_response.status_code != 200:
            print(f"❌ OTP verification failed: {otp_response.status_code}")
            print(f"Response: {otp_response.text}")
            return False
            
        otp_data = otp_response.json()
        token = otp_data.get("token")
        print(f"✅ OTP verification successful")
        
        # Step 4: Test system settings API
        print("🛠️ Step 4: Testing system settings API...")
        headers = {"Authorization": f"Bearer {token}"}
        
        settings_response = session.get(
            f"{API_URL}/admin/settings",
            headers=headers,
            timeout=10
        )
        
        if settings_response.status_code != 200:
            print(f"❌ Settings API failed: {settings_response.status_code}")
            print(f"Response: {settings_response.text}")
            return False
            
        settings_data = settings_response.json()
        print(f"✅ Settings API successful - Retrieved {len(settings_data)} settings")
        
        # Step 5: Test settings update
        print("✏️ Step 5: Testing settings update...")
        if settings_data:
            test_setting = settings_data[0]
            update_response = session.put(
                f"{API_URL}/admin/settings/{test_setting['id']}",
                headers=headers,
                json={
                    "setting_value": test_setting["setting_value"],
                    "description": "Updated by authentication test script"
                },
                timeout=10
            )
            
            if update_response.status_code == 200:
                print("✅ Settings update successful")
            else:
                print(f"⚠️ Settings update failed: {update_response.status_code}")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to API server. Make sure Flask server is running on localhost:5000")
        return False
    except Exception as e:
        print(f"❌ API test error: {str(e)}")
        return False

def display_admin_info():
    """Display information about existing admins"""
    print("\n👥 Admin Accounts Summary:")
    print("=" * 50)
    
    try:
        with app.app_context():
            admins = Admin.query.all()
            
            if not admins:
                print("No admin accounts found in database")
                return
                
            for admin in admins:
                print(f"📋 Admin: {admin.firstname} {admin.lastname}")
                print(f"   • ID Number: {admin.id_number}")
                print(f"   • Email: {admin.email}")
                print(f"   • Username: {admin.username}")
                print(f"   • Created: {admin.created_at}")
                print(f"   • Last Login: {admin.last_login or 'Never'}")
                print()
                
    except Exception as e:
        print(f"❌ Error displaying admin info: {str(e)}")

def display_settings_info():
    """Display information about system settings"""
    print("\n📊 System Settings Summary:")
    print("=" * 50)
    
    try:
        with app.app_context():
            categories = db.session.query(SystemSettings.category).distinct().all()
            
            if not categories:
                print("No system settings found in database")
                return
                
            total_settings = 0
            for (category,) in categories:
                settings = SystemSettings.query.filter_by(category=category).all()
                total_settings += len(settings)
                print(f"📁 {category.upper()}: {len(settings)} settings")
                
            print(f"\n📈 Total: {total_settings} system settings")
                
    except Exception as e:
        print(f"❌ Error displaying settings info: {str(e)}")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Test PostgreSQL admin authentication')
    parser.add_argument('--create-admin', action='store_true', help='Create test admin account')
    parser.add_argument('--test-settings', action='store_true', help='Test system settings operations')
    parser.add_argument('--test-api', action='store_true', help='Test API endpoints')
    
    args = parser.parse_args()
    
    print("🐘 PostgreSQL Admin Authentication Test Script")
    print("=" * 50)
    
    try:
        # Test database connection
        with app.app_context():
            db.create_all()
            print("✅ Database connection successful")
            
        # Display current state
        display_admin_info()
        display_settings_info()
        
        # Create admin if requested
        if args.create_admin:
            admin = create_test_admin()
            if not admin:
                print("❌ Failed to create test admin")
                return 1
                
        # Test authentication flow
        if not test_admin_authentication():
            print("❌ Admin authentication test failed")
            return 1
            
        # Test system settings if requested
        if args.test_settings:
            if not test_system_settings_crud():
                print("❌ System settings test failed")
                return 1
                
        # Test API endpoints if requested
        if args.test_api:
            if not test_api_endpoints():
                print("❌ API endpoint test failed")
                return 1
                
        print("\n🎉 All tests completed successfully!")
        print("\n📝 Next steps:")
        print("1. Start your Flask server: python run.py")
        print("2. Start your frontend: npm run dev")
        print("3. Test admin login at: http://localhost:3000/admin/login")
        print("4. Access settings at: http://localhost:3000/admin/settings")
        
        return 0
        
    except Exception as e:
        print(f"❌ Script error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
