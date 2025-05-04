from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.admin import Admin

class AdminController:
    @staticmethod
    @jwt_required()
    def get_admin_info():
        admin_id = get_jwt_identity()
        admin = Admin.query.filter_by(admin_id=admin_id).first()
        if not admin:
            return jsonify({'message': 'Admin not found'}), 404
        return jsonify({
            'full_name': admin.full_name(),
            'id_number': admin.id_number
        }), 200