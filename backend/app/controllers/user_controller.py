from flask import jsonify, request, current_app
from werkzeug.exceptions import Unauthorized
import jwt
from app.models.voter import Voter

class UserController:
    @staticmethod
    def get_user_info():
        """Get currently authenticated voter/user information"""
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'message': 'Missing or invalid token'}), 401
            
            token = auth_header.split(' ')[1]
            
            try:
                # Decode token
                data = jwt.decode(
                    token,
                    current_app.config['JWT_SECRET_KEY'],
                    algorithms=['HS256']
                )
                
                # Get voter
                voter = Voter.query.get(data['student_id'])
                if not voter:
                    return jsonify({'message': 'User not found'}), 401
                
                return jsonify({
                    'student_id': voter.student_id,
                    'first_name': voter.firstname,
                    'last_name': voter.lastname,
                    'student_email': voter.student_email,
                    'college_id': voter.college_id,
                    'status': voter.status
                }), 200
                
            except jwt.ExpiredSignatureError:
                return jsonify({'message': 'Token expired'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'message': 'Invalid token'}), 401
                
        except Exception as e:
            current_app.logger.error(f"Get user info error: {str(e)}")
            return jsonify({'message': str(e)}), 500