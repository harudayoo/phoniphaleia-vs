#!/usr/bin/env python3

import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.system_settings import SystemSettings

def update_settings_categories():
    """Update system settings to match frontend expected categories"""
    
    app = create_app()
    
    with app.app_context():
        try:
            print("Updating system settings categories...")
            
            # Clear existing settings first
            SystemSettings.query.delete()
            db.session.commit()
            print("Cleared existing settings")
            
            # Define settings that match the frontend structure
            settings_to_create = [
                # General settings
                ('general', 'systemName', 'Phoniphaleia Voting System', 'System name displayed throughout the application'),
                ('general', 'contactEmail', 'admin@usep.edu.ph', 'Main contact email for the system'),
                ('general', 'supportPhone', '+63 82 227 8192', 'Support phone number'),
                ('general', 'maintenanceMode', False, 'Enable maintenance mode to restrict access'),
                ('general', 'copyrightText', '© 2025 University of Southeastern Philippines', 'Copyright text displayed in footer'),
                
                # Elections settings
                ('elections', 'defaultDuration', 7, 'Default election duration in days'),
                ('elections', 'reminderHours', 24, 'Hours before election end to send reminders'),
                ('elections', 'resultDelay', 0, 'Hours to delay result publication after election ends'),
                ('elections', 'minimumCandidates', 2, 'Minimum number of candidates required for an election'),
                ('elections', 'requireConfirmation', True, 'Require voter confirmation before submitting ballot'),
                
                # Security settings
                ('security', 'sessionTimeout', 30, 'Session timeout in minutes'),
                ('security', 'failedAttempts', 5, 'Maximum failed login attempts before lockout'),
                ('security', 'passwordExpiryDays', 90, 'Number of days before password expires'),
                ('security', 'mfaRequired', False, 'Require multi-factor authentication for administrators'),
                ('security', 'ipRestriction', False, 'Enable IP restriction for admin access'),
                
                # Notifications settings
                ('notifications', 'emailNotifications', True, 'Enable email notifications to voters'),
                ('notifications', 'adminAlerts', True, 'Send alerts to administrators'),
                ('notifications', 'resultNotifications', True, 'Send notifications when results are published'),
                ('notifications', 'systemAlerts', True, 'Send system maintenance and error alerts'),
                
                # Users settings
                ('users', 'autoApprove', False, 'Automatically approve new user registrations'),
                ('users', 'allowSelfRegistration', True, 'Allow users to register themselves'),
                ('users', 'inactivityDays', 365, 'Days of inactivity before account is flagged'),
                ('users', 'maxAdminUsers', 10, 'Maximum number of admin users allowed'),
                
                # Backup settings
                ('backup', 'autoBackup', True, 'Enable automatic database backups'),
                ('backup', 'backupFrequency', 24, 'Backup frequency in hours'),
                ('backup', 'retentionDays', 30, 'Number of days to retain backup files'),
                ('backup', 'includeAttachments', True, 'Include file attachments in backups'),
            ]
            
            # Create all settings
            for category, setting_key, value, description in settings_to_create:
                setting = SystemSettings(
                    category=category,
                    setting_key=setting_key,
                    description=description
                )
                setting.set_typed_value(value)
                db.session.add(setting)
                print(f"Added {category}.{setting_key} = {value}")
            
            db.session.commit()
            print(f"\nSuccessfully created {len(settings_to_create)} system settings!")
            
            # Verify the settings
            all_settings = SystemSettings.get_all_settings()
            print("\nCurrent settings structure:")
            for category, settings in all_settings.items():
                print(f"  {category}: {len(settings)} settings")
                for key in settings.keys():
                    print(f"    - {key}")
            
        except Exception as e:
            print(f"Error updating settings: {str(e)}")
            db.session.rollback()
            return False
            
    return True

if __name__ == '__main__':
    success = update_settings_categories()
    if success:
        print("\n✓ System settings updated successfully!")
    else:
        print("\n✗ Failed to update system settings")
        sys.exit(1)
