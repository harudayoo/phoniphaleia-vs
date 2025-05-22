from flask import Blueprint
from app.controllers.user_controller import UserController

user_bp = Blueprint('user', __name__, url_prefix='/api/user')

# Get current user information
user_bp.route('/me', methods=['GET'])(UserController.get_user_info)

# Submit a support ticket
user_bp.route('/support-ticket', methods=['POST', 'OPTIONS'])(UserController.submit_support_ticket)

# Stub route for user settings
@user_bp.route('/settings', methods=['GET'])
def get_user_settings():
    # Return default notification settings for now
    return {
        "notifications": {
            "email_notifications": True,
            "election_reminders": True,
            "result_notifications": True
        }
    }, 200

user_bp.route('/update-photo', methods=['POST', 'OPTIONS'])(UserController.update_photo)

@user_bp.route('/settings', methods=['POST', 'OPTIONS'])
def update_user_settings():
    from flask import request, jsonify
    # In a real app, save settings to DB per user. Here, just echo back.
    data = request.get_json()
    return jsonify({'message': 'Settings updated', 'settings': data}), 200

user_bp.route('/change-password', methods=['POST', 'OPTIONS'])(UserController.change_password)

# Add other user routes as needed