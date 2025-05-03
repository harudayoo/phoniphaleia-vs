# backend/app/routes/auth_routes.py
from flask import Blueprint
from app.controllers.auth_controller import AuthController

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

auth_bp.route('/register', methods=['POST'])(AuthController.register)
auth_bp.route('/login', methods=['POST'])(AuthController.login)
auth_bp.route('/me', methods=['GET'])(AuthController.get_current_voter)
auth_bp.route('/verify_challenge', methods=['POST'])(AuthController.verify_challenge)
auth_bp.route('/admin_register', methods=['POST'])(AuthController.admin_register)
auth_bp.route('/admin/login', methods=['POST'])(AuthController.admin_login)
auth_bp.route('/admin/verify_otp', methods=['POST'])(AuthController.admin_verify_otp)
auth_bp.route('/admin/resend_otp', methods=['POST'])(AuthController.admin_resend_otp)