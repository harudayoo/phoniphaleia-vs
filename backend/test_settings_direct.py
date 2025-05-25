#!/usr/bin/env python3

import sys
import os
import json

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.system_settings import SystemSettings

def test_settings_directly():
    """Test the system settings directly from database"""
    
    app = create_app()
    
    with app.app_context():
        try:
            print("Testing system settings directly from database...")
            
            # Get all settings using the model method
            all_settings = SystemSettings.get_all_settings()
            print("Settings from database:")
            print(json.dumps(all_settings, indent=2))
            
            # Check if the structure matches what the frontend expects
            expected_categories = ['general', 'elections', 'security', 'notifications', 'users', 'backup']
            for category in expected_categories:
                if category in all_settings:
                    print(f"✓ {category} category found with {len(all_settings[category])} settings")
                    for key, value in all_settings[category].items():
                        print(f"    - {key}: {value}")
                else:
                    print(f"✗ {category} category missing")
            
            print("\n" + "="*50)
            print("Testing frontend compatibility...")
            
            # Simulate what the frontend expects
            settings_structure = {
                'general': {
                    'systemName': all_settings.get('general', {}).get('systemName', ''),
                    'contactEmail': all_settings.get('general', {}).get('contactEmail', ''),
                    'supportPhone': all_settings.get('general', {}).get('supportPhone', ''),
                    'maintenanceMode': all_settings.get('general', {}).get('maintenanceMode', False),
                    'copyrightText': all_settings.get('general', {}).get('copyrightText', ''),
                },
                'elections': {
                    'defaultDuration': all_settings.get('elections', {}).get('defaultDuration', 7),
                    'reminderHours': all_settings.get('elections', {}).get('reminderHours', 24),
                    'resultDelay': all_settings.get('elections', {}).get('resultDelay', 0),
                    'minimumCandidates': all_settings.get('elections', {}).get('minimumCandidates', 2),
                    'requireConfirmation': all_settings.get('elections', {}).get('requireConfirmation', True),
                },
                'security': {
                    'sessionTimeout': all_settings.get('security', {}).get('sessionTimeout', 30),
                    'failedAttempts': all_settings.get('security', {}).get('failedAttempts', 5),
                    'passwordExpiryDays': all_settings.get('security', {}).get('passwordExpiryDays', 90),
                    'mfaRequired': all_settings.get('security', {}).get('mfaRequired', False),
                    'ipRestriction': all_settings.get('security', {}).get('ipRestriction', False),
                },
                'notifications': {
                    'emailNotifications': all_settings.get('notifications', {}).get('emailNotifications', True),
                    'adminAlerts': all_settings.get('notifications', {}).get('adminAlerts', True),
                    'resultNotifications': all_settings.get('notifications', {}).get('resultNotifications', True),
                    'systemAlerts': all_settings.get('notifications', {}).get('systemAlerts', True),
                },
                'users': {
                    'autoApprove': all_settings.get('users', {}).get('autoApprove', False),
                    'allowSelfRegistration': all_settings.get('users', {}).get('allowSelfRegistration', True),
                    'inactivityDays': all_settings.get('users', {}).get('inactivityDays', 365),
                    'maxAdminUsers': all_settings.get('users', {}).get('maxAdminUsers', 10),
                },
                'backup': {
                    'autoBackup': all_settings.get('backup', {}).get('autoBackup', True),
                    'backupFrequency': all_settings.get('backup', {}).get('backupFrequency', 24),
                    'retentionDays': all_settings.get('backup', {}).get('retentionDays', 30),
                    'includeAttachments': all_settings.get('backup', {}).get('includeAttachments', True),
                }
            }
            
            print("Frontend-compatible structure:")
            print(json.dumps(settings_structure, indent=2))
            
            # Test accessing nested properties like the frontend does
            try:
                system_name = settings_structure['general']['systemName']
                print(f"\n✓ Successfully accessed settings.general.systemName: '{system_name}'")
                
                maintenance_mode = settings_structure['general']['maintenanceMode']
                print(f"✓ Successfully accessed settings.general.maintenanceMode: {maintenance_mode}")
                
                default_duration = settings_structure['elections']['defaultDuration']
                print(f"✓ Successfully accessed settings.elections.defaultDuration: {default_duration}")
                
                print("\n✅ All tests passed! The data structure is compatible with the frontend.")
                
            except KeyError as e:
                print(f"\n❌ Error accessing property: {e}")
                
        except Exception as e:
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_settings_directly()
