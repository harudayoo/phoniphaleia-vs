#!/usr/bin/env python3

import sys
import os
import requests
import json

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.admin import Admin

def test_settings_api():
    """Test the system settings API with authentication"""
    
    app = create_app()
    
    with app.app_context():
        try:            # Check if test admin user exists or use any existing admin
            test_admin = Admin.query.filter_by(email='test@admin.com').first()
            if not test_admin:
                # Try to find any existing admin
                test_admin = Admin.query.first()
                if test_admin:
                    print(f"Using existing admin: {test_admin.email} (ID: {test_admin.id_number})")
                    # For testing, we'll use a common password - this is just for API testing
                    login_id_number = test_admin.id_number
                    login_password = 'admin123'  # Assuming this is a common test password
                else:
                    print("No admin users found. Please create an admin first.")
                    return
            else:
                print("Using test admin user")
                login_id_number = test_admin.id_number
                login_password = 'testpassword123'
            
            # Login to get a token
            login_data = {
                'id_number': login_id_number,
                'password': login_password
            }
            print("Attempting to login...")
            login_response = requests.post('http://localhost:5000/api/auth/admin/login', json=login_data)
            print(f"Login Status Code: {login_response.status_code}")
            
            if login_response.status_code == 200:
                login_result = login_response.json()
                token = login_result.get('access_token')
                print("Login successful, got token")
                
                # Test the settings API with authentication
                headers = {
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }
                
                print("\nTesting GET /api/admin/settings...")
                settings_response = requests.get('http://localhost:5000/api/admin/settings', headers=headers)
                print(f"Settings Status Code: {settings_response.status_code}")
                
                if settings_response.status_code == 200:
                    settings_data = settings_response.json()
                    print("Settings API Response:")
                    print(json.dumps(settings_data, indent=2))
                    
                    # Check if the structure matches what the frontend expects
                    expected_categories = ['general', 'elections', 'security', 'notifications', 'users', 'backup']
                    for category in expected_categories:
                        if category in settings_data:
                            print(f"✓ {category} category found with {len(settings_data[category])} settings")
                        else:
                            print(f"✗ {category} category missing")
                else:
                    print(f"Settings API Error: {settings_response.text}")
            else:
                print(f"Login failed: {login_response.text}")
                
        except Exception as e:
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_settings_api()
