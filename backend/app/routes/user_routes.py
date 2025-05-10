from flask import Blueprint
from app.controllers.user_controller import UserController

user_bp = Blueprint('user', __name__, url_prefix='/api/user')

# Get current user information
user_bp.route('/me', methods=['GET'])(UserController.get_user_info)

# Add other user routes as needed