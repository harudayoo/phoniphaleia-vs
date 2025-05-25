#!/usr/bin/env python3
"""
System Settings Initialization and Admin Authentication Test Script
==================================================================

This script will:
1. Initialize default system settings in the database
2. Create a test admin account if needed
3. Test the admin authentication flow
4. Verify the system settings API endpoints work correctly

Usage:
    python initialize_system_settings.py [--reset] [--test-auth]
    
Options:
    --reset      Reset all existing settings before initializing
    --test-auth  Run authentication tests after initialization
"""

import sys
import os
import argparse
import json
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.system_settings import SystemSettings
from app.models.admin import Admin
from sqlalchemy.exc import IntegrityError

def create_default_settings():
    """Create default system settings"""
    default_settings = {
        # Voting Configuration
        'voting': {
            'voting_enabled': True,
            'allow_vote_changes': False,
            'voting_start_time': None,
            'voting_end_time': None,
            'max_votes_per_user': 1,
            'require_photo_verification': True,
            'enable_anonymous_voting': False
        },
        
        # Security Settings
        'security': {
            'session_timeout_minutes': 30,
            'max_login_attempts': 5,
            'lockout_duration_minutes': 15,
            'password_expiry_days': 90,
            'require_2fa': False,
            'jwt_expiry_hours': 24
        },
        
        # Authentication Settings
        'authentication': {
            'enable_email_verification': True,
            'email_verification_expiry_minutes': 30,
            'otp_expiry_minutes': 5,
            'enable_admin_approval': True,
            'auto_approve_verified_emails': False
        },
        
        # System Maintenance
        'maintenance': {
            'maintenance_mode': False,
            'maintenance_message': 'The system is currently under maintenance. Please try again later.',
            'backup_frequency_hours': 24,
            'log_retention_days': 30,
            'enable_audit_logging': True
        },
        
        # Email Notifications
        'notifications': {
            'enable_email_notifications': True,
            'admin_notification_email': 'admin@usep.edu.ph',
            'send_voting_reminders': True,
            'send_result_notifications': True,
            'notification_frequency_hours': 4
        },
        
        # Results & Analytics
        'results': {
            'show_live_results': False,
            'show_partial_results': False,
            'enable_result_export': True,
            'anonymize_exported_data': True,
            'result_publication_delay_minutes': 0
        },
        
        # UI Customization
        'ui': {
            'system_name': 'Phoniphaleia Voting System',
            'theme_color': '#991b1b',
            'logo_url': '/images/usep-logo.png',
            'welcome_message': 'Welcome to the USEP Student Voting System',
            'show_candidate_photos': True,
            'enable_dark_mode': False
        }
    }
    
    return default_settings

def initialize_settings(reset=False):
    """Initialize system settings in the database"""
    print("🔧 Initializing system settings...")
    
    try:
        if reset:
            print("🗑️  Clearing existing settings...")
            SystemSettings.query.delete()
            db.session.commit()
            
        # Get default settings
        default_settings = create_default_settings()
        
        # Check if settings already exist
        existing_count = SystemSettings.query.count()
        if existing_count > 0 and not reset:
            print(f"ℹ️  Found {existing_count} existing settings. Use --reset to reinitialize.")
            return True
              # Create settings for each category
        settings_created = 0
        for category, settings in default_settings.items():
            for key, value in settings.items():
                # Check if setting already exists
                existing_setting = SystemSettings.query.filter_by(
                    category=category, 
                    setting_key=key
                ).first()
                
                if existing_setting:
                    print(f"⚠️  Setting {category}.{key} already exists, skipping...")
                    continue
                
                # Create new setting using the model's built-in method
                setting = SystemSettings(
                    category=category,
                    setting_key=key,
                    description=f"Default {key.replace('_', ' ').title()} setting for {category}"
                )
                
                # Use the model's method to set the typed value
                setting.set_typed_value(value)
                
                try:
                    db.session.add(setting)
                    settings_created += 1
                except Exception as e:
                    db.session.rollback()
                    print(f"❌ Error creating setting {category}.{key}: {e}")
                    continue
                    
        db.session.commit()
        print(f"✅ Successfully created {settings_created} system settings")
        return True
        
    except Exception as e:
        print(f"❌ Error initializing settings: {str(e)}")
        db.session.rollback()
        return False

def ensure_test_admin():
    """Ensure a test admin account exists"""
    print("👤 Checking test admin account...")
    
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
        print(f"🔑 Login credentials - ID: {test_admin_data['id_number']}, Password: {test_admin_data['password']}")
        return admin
        
    except Exception as e:
        print(f"❌ Error creating test admin: {str(e)}")
        db.session.rollback()
        return None

def test_authentication():
    """Test the admin authentication flow"""
    print("\n🧪 Testing admin authentication flow...")
    
    import requests
    
    API_URL = "http://localhost:5000/api"
    test_credentials = {
        "id_number": "2024-99999",
        "password": "TestAdmin123!"
    }
    
    session = requests.Session()
    
    try:
        # Step 1: Admin login
        print("🔐 Step 1: Admin login...")
        login_response = session.post(
            f"{API_URL}/auth/admin/login",
            json=test_credentials
        )
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
            return False
            
        login_data = login_response.json()
        admin_id = login_data.get("admin_id")
        print(f"✅ Login successful - Admin ID: {admin_id}")
        
        # Step 2: Get OTP from database (simulate OTP verification)
        print("🔑 Step 2: Getting OTP from database...")
        admin = Admin.query.get(admin_id)
        if not admin or not admin.otp_code:
            print("❌ No OTP found in database")
            return False
            
        otp = admin.otp_code
        print(f"✅ Retrieved OTP: {otp}")
        
        # Step 3: Verify OTP
        print("✅ Step 3: Verifying OTP...")
        otp_response = session.post(
            f"{API_URL}/auth/admin/verify_otp",
            json={
                "admin_id": admin_id,
                "otp": otp
            }
        )
        
        if otp_response.status_code != 200:
            print(f"❌ OTP verification failed: {otp_response.status_code} - {otp_response.text}")
            return False
            
        otp_data = otp_response.json()
        token = otp_data.get("token")
        print(f"✅ OTP verification successful - Token: {token[:50]}...")
        
        # Step 4: Test system settings API
        print("🛠️  Step 4: Testing system settings API...")
        headers = {"Authorization": f"Bearer {token}"}
        
        settings_response = session.get(
            f"{API_URL}/admin/settings",
            headers=headers
        )
        
        if settings_response.status_code != 200:
            print(f"❌ Settings API failed: {settings_response.status_code} - {settings_response.text}")
            return False
            
        settings_data = settings_response.json()
        print(f"✅ Settings API successful - Retrieved {len(settings_data)} settings")
        
        return True
        
    except Exception as e:
        print(f"❌ Authentication test error: {str(e)}")
        return False

def display_settings_summary():
    """Display a summary of current system settings"""
    print("\n📊 System Settings Summary:")
    print("=" * 50)
    
    try:
        categories = db.session.query(SystemSettings.category).distinct().all()
        
        for (category,) in categories:
            settings = SystemSettings.query.filter_by(category=category).all()
            print(f"\n📁 {category.upper()} ({len(settings)} settings)")
            for setting in settings[:5]:  # Show first 5 settings per category
                value = setting.get_typed_value()
                if len(str(value)) > 50:
                    value = str(value)[:47] + "..."
                print(f"   • {setting.setting_key}: {value}")
                
            if len(settings) > 5:
                print(f"   ... and {len(settings) - 5} more settings")
                
    except Exception as e:
        print(f"❌ Error displaying settings: {str(e)}")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Initialize system settings and test authentication')
    parser.add_argument('--reset', action='store_true', help='Reset existing settings')
    parser.add_argument('--test-auth', action='store_true', help='Run authentication tests')
    
    args = parser.parse_args()
    
    print("🚀 Phoniphaleia System Settings Initializer")
    print("=" * 50)
    
    # Create Flask app context
    app = create_app()
    
    with app.app_context():
        # Initialize database tables
        print("🗄️  Creating database tables...")
        db.create_all()
        
        # Initialize settings
        if not initialize_settings(reset=args.reset):
            print("❌ Failed to initialize settings")
            return 1
            
        # Ensure test admin exists
        admin = ensure_test_admin()
        if not admin:
            print("❌ Failed to create test admin")
            return 1
            
        # Display settings summary
        display_settings_summary()
        
        # Run authentication tests if requested
        if args.test_auth:
            if not test_authentication():
                print("❌ Authentication tests failed")
                return 1
                
        print("\n🎉 Initialization completed successfully!")
        print("\n📝 Next steps:")
        print("1. Start your Flask server: python run.py")
        print("2. Test admin login with:")
        print("   - ID: 2024-99999")
        print("   - Password: TestAdmin123!")
        print("3. Access admin settings at: http://localhost:3000/admin/settings")
        
        return 0

if __name__ == "__main__":
    sys.exit(main())