from flask import jsonify, request, current_app
from app import db
from app.models.system_settings import SystemSettings
import json

class SystemSettingsController:
    
    @staticmethod
    def get_all_settings():
        """Get all system settings organized by category"""
        try:
            settings = SystemSettings.get_all_settings()
            return jsonify(settings), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching system settings: {str(e)}")
            return jsonify({'message': f'Error fetching settings: {str(e)}'}), 500
    
    @staticmethod
    def get_category_settings(category):
        """Get settings for a specific category"""
        try:
            settings = SystemSettings.get_category_settings(category)
            return jsonify(settings), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching {category} settings: {str(e)}")
            return jsonify({'message': f'Error fetching {category} settings: {str(e)}'}), 500
    
    @staticmethod
    def update_settings():
        """Update system settings from request data"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'message': 'No data provided'}), 400
            
            updated_categories = []
            
            # Process each category in the data
            for category, settings in data.items():
                if isinstance(settings, dict):
                    # Update all settings in this category
                    SystemSettings.bulk_update_category(category, settings)
                    updated_categories.append(category)
            
            return jsonify({
                'message': 'Settings updated successfully',
                'updated_categories': updated_categories
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error updating system settings: {str(e)}")
            db.session.rollback()
            return jsonify({'message': f'Error updating settings: {str(e)}'}), 500
    
    @staticmethod
    def update_category_settings(category):
        """Update settings for a specific category"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'message': 'No data provided'}), 400
            
            # Update settings in the specified category
            SystemSettings.bulk_update_category(category, data)
            
            return jsonify({
                'message': f'{category.capitalize()} settings updated successfully',
                'category': category
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error updating {category} settings: {str(e)}")
            db.session.rollback()
            return jsonify({'message': f'Error updating {category} settings: {str(e)}'}), 500
    
    @staticmethod
    def get_setting(category, setting_key):
        """Get a specific setting value"""
        try:
            value = SystemSettings.get_setting(category, setting_key)
            if value is not None:
                return jsonify({
                    'category': category,
                    'setting_key': setting_key,
                    'value': value
                }), 200
            else:
                return jsonify({'message': 'Setting not found'}), 404
                
        except Exception as e:
            current_app.logger.error(f"Error fetching setting {category}.{setting_key}: {str(e)}")
            return jsonify({'message': f'Error fetching setting: {str(e)}'}), 500
    
    @staticmethod
    def set_setting(category, setting_key):
        """Set a specific setting value"""
        try:
            data = request.get_json()
            if not data or 'value' not in data:
                return jsonify({'message': 'Value is required'}), 400
            
            value = data['value']
            description = data.get('description')
            
            setting = SystemSettings.set_setting(category, setting_key, value, description)
            
            return jsonify({
                'message': 'Setting updated successfully',
                'setting': setting.to_dict()
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Error setting {category}.{setting_key}: {str(e)}")
            db.session.rollback()
            return jsonify({'message': f'Error setting value: {str(e)}'}), 500
    
    @staticmethod
    def initialize_default_settings():
        """Initialize default system settings if they don't exist"""
        try:
            default_settings = {
                'general': {
                    'systemName': 'Phoniphaleia Voting System',
                    'contactEmail': 'admin@phoniphaleia.edu',
                    'supportPhone': '(555) 123-4567',
                    'maintenanceMode': False,
                    'copyrightText': '© 2025 Phoniphaleia University. All rights reserved.'
                },
                'elections': {
                    'defaultDuration': 7,
                    'reminderHours': 24,
                    'resultDelay': 2,
                    'minimumCandidates': 2,
                    'requireConfirmation': True
                },
                'security': {
                    'sessionTimeout': 30,
                    'failedAttempts': 5,
                    'passwordExpiryDays': 90,
                    'mfaRequired': True,
                    'ipRestriction': False
                },
                'notifications': {
                    'emailNotifications': True,
                    'adminAlerts': True,
                    'resultNotifications': True,
                    'systemAlerts': True
                },
                'users': {
                    'autoApprove': False,
                    'allowSelfRegistration': True,
                    'inactivityDays': 180,
                    'maxAdminUsers': 5
                },
                'backup': {
                    'autoBackup': True,
                    'backupFrequency': 1,
                    'retentionDays': 30,
                    'includeAttachments': True
                }
            }
            
            for category, settings in default_settings.items():
                for setting_key, value in settings.items():
                    # Only set if setting doesn't already exist
                    existing = SystemSettings.query.filter_by(
                        category=category, 
                        setting_key=setting_key
                    ).first()
                    if not existing:
                        SystemSettings.set_setting(category, setting_key, value)
            
            return jsonify({'message': 'Default settings initialized successfully'}), 200
            
        except Exception as e:
            current_app.logger.error(f"Error initializing default settings: {str(e)}")
            db.session.rollback()
            return jsonify({'message': f'Error initializing default settings: {str(e)}'}), 500
