from flask import Blueprint, request, jsonify, current_app
import jwt
from app.models.admin import Admin
from app.controllers.admin_controller import AdminController

admin_bp = Blueprint('admin', __name__, url_prefix='/api')

@admin_bp.route('/admin/me', methods=['GET'])
def get_admin_me():
    return AdminController.get_admin_info()