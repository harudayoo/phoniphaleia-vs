from flask import Blueprint
from app.controllers.system_settings_controller import SystemSettingsController
from app.utils.auth import admin_required

system_settings_bp = Blueprint('system_settings', __name__, url_prefix='/api')

# Get all system settings
@system_settings_bp.route('/admin/settings', methods=['GET'])
@admin_required
def get_all_settings():
    return SystemSettingsController.get_all_settings()

# Update all system settings
@system_settings_bp.route('/admin/settings', methods=['PUT'])
@admin_required
def update_settings():
    return SystemSettingsController.update_settings()

# Get settings for a specific category
@system_settings_bp.route('/admin/settings/<category>', methods=['GET'])
@admin_required
def get_category_settings(category):
    return SystemSettingsController.get_category_settings(category)

# Update settings for a specific category
@system_settings_bp.route('/admin/settings/<category>', methods=['PUT'])
@admin_required
def update_category_settings(category):
    return SystemSettingsController.update_category_settings(category)

# Get a specific setting
@system_settings_bp.route('/admin/settings/<category>/<setting_key>', methods=['GET'])
@admin_required
def get_setting(category, setting_key):
    return SystemSettingsController.get_setting(category, setting_key)

# Set a specific setting
@system_settings_bp.route('/admin/settings/<category>/<setting_key>', methods=['PUT'])
@admin_required
def set_setting(category, setting_key):
    return SystemSettingsController.set_setting(category, setting_key)

# Initialize default settings (useful for first setup)
@system_settings_bp.route('/admin/settings/initialize', methods=['POST'])
@admin_required
def initialize_default_settings():
    return SystemSettingsController.initialize_default_settings()
