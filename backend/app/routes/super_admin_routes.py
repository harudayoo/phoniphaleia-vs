from flask import Blueprint
from app.controllers.super_admin_controller import SuperAdminController

super_admin_bp = Blueprint('super_admin', __name__, url_prefix='/api/super_admin')

# Authentication routes
super_admin_bp.route('/login', methods=['POST'])(SuperAdminController.login)
super_admin_bp.route('/verify_otp', methods=['POST'])(SuperAdminController.verify_otp)
super_admin_bp.route('/resend_otp', methods=['POST'])(SuperAdminController.resend_otp)
super_admin_bp.route('/logout', methods=['POST'])(SuperAdminController.logout)

# Admin management routes
super_admin_bp.route('/pending_admins', methods=['GET'])(SuperAdminController.get_pending_admins)
super_admin_bp.route('/pending_admins/<int:pending_id>', methods=['GET'])(SuperAdminController.get_pending_admin)
super_admin_bp.route('/pending_admins/<int:pending_id>/approve', methods=['POST'])(SuperAdminController.approve_pending_admin)
super_admin_bp.route('/pending_admins/<int:pending_id>/reject', methods=['POST'])(SuperAdminController.reject_pending_admin)
super_admin_bp.route('/admins', methods=['GET'])(SuperAdminController.get_admins)
super_admin_bp.route('/admins/<int:admin_id>', methods=['GET'])(SuperAdminController.get_admin)
super_admin_bp.route('/admins/<int:admin_id>', methods=['DELETE'])(SuperAdminController.delete_admin)

# Account settings routes
super_admin_bp.route('/me', methods=['GET'])(SuperAdminController.get_profile)
super_admin_bp.route('/me', methods=['PUT'])(SuperAdminController.update_profile)
super_admin_bp.route('/change_password', methods=['POST'])(SuperAdminController.change_password)
