from flask import jsonify, request, current_app
import jwt
from app.models.admin import Admin

class AdminController:
    @staticmethod
    def get_admin_info():
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'message': 'Missing or invalid token'}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            admin = Admin.query.get(payload['admin_id'])
            
            if not admin:
                return jsonify({'message': 'Admin not found'}), 401
                
            return jsonify({
                'full_name': admin.full_name(),
                'id_number': admin.id_number,
            }), 200
            
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401