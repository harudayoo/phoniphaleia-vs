# backend/app/routes/auth_routes.py
from flask import Blueprint
from app.controllers.auth_controller import AuthController

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

auth_bp.route('/register', methods=['POST'])(AuthController.register)
auth_bp.route('/login', methods=['POST'])(AuthController.login)
auth_bp.route('/verify_otp', methods=['POST'])(AuthController.verify_otp)
auth_bp.route('/resend_otp', methods=['POST'])(AuthController.resend_otp)
auth_bp.route('/admin_register', methods=['POST'])(AuthController.admin_register)
auth_bp.route('/admin/login', methods=['POST'])(AuthController.admin_login)
auth_bp.route('/admin/verify_otp', methods=['POST'])(AuthController.admin_verify_otp)
auth_bp.route('/admin/resend_otp', methods=['POST'])(AuthController.admin_resend_otp)
auth_bp.route('/logout', methods=['POST'])(AuthController.logout)

# Session management
@auth_bp.route('/refresh-session', methods=['POST'])
def refresh_session():
    return AuthController.refresh_session()