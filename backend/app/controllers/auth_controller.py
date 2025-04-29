from flask import request, jsonify, current_app
from app.models.voter import Voter
from app.services.zkp.zkp_service import ZKPService
import jwt
from datetime import datetime, timedelta
from marshmallow import ValidationError
from typing import Dict, Any
from app import db

class AuthController:
    @staticmethod
    def register():
        """Handle only the POST request"""
        if request.method == 'OPTIONS':
            # This should never be reached if routes are properly configured
            return jsonify({'message': 'Should be handled by before_request'}), 200
            
        try:
            data = request.get_json()
            
            # Validate input
            if not all(k in data for k in ['student_id', 'student_email', 'password']):
                return jsonify({"message": "Missing required fields"}), 400
                
            if not ZKPService.validate_student_id(data['student_id']):
                return jsonify({"message": "Invalid student ID format"}), 400
            
            # Check for existing user
            if Voter.query.filter_by(student_id=data['student_id']).first():
                return jsonify({"message": "Student ID already registered"}), 409
                
            if Voter.query.filter_by(student_email=data['student_email']).first():
                return jsonify({"message": "Email already registered"}), 409
            
            # Create new voter with ZKP credentials
            new_voter = Voter(
                student_id=data['student_id'],
                student_email=data['student_email'],
                college_id=data['college_id'],
                firstName=data['firstName'],
                lastName=data['lastName'],
                middleName=data.get('middleName'),
                status='pending',  # Default status for new registrations
                password=data['password_hash'],  # This is already hashed from frontend
                zkp_commitment=data['zkp_commitment']
            )
            # Set ZKP credentials
            new_voter.set_zkp_credentials(data['student_id'], data['password'])
            
            # Save to database
            db.session.add(new_voter)
            db.session.commit()
            
            return jsonify({
                "message": "Registration successful",
                "commitment": new_voter.zkp_commitment
            }), 201
            
        except ValidationError as e:
            return jsonify({"message": "Validation error", "errors": e.messages}), 400
        except Exception as e:
            current_app.logger.error(f"Registration error: {str(e)}")
            return jsonify({"message": "An error occurred during registration"}), 500

    @staticmethod
    def login():
        """Initiate ZKP authentication flow"""
        try:
            data = request.get_json()
            student_id = data.get('student_id')
            
            if not student_id:
                return jsonify({'message': 'Student ID required'}), 400
                
            voter = Voter.query.filter_by(student_id=student_id).first()
            if not voter:
                return jsonify({'message': 'Invalid credentials'}), 401
                
            # Generate challenge
            zkp_service = ZKPService()
            challenge = zkp_service.generate_challenge()
            
            # In production, store challenge in Redis with expiration
            # redis_client.setex(f"zkp_challenge:{student_id}", 300, challenge)
            
            return jsonify({
                'message': 'Authentication challenge',
                'challenge': challenge
            }), 200
        except Exception as e:
            current_app.logger.error(f"Login error: {str(e)}")
            return jsonify({'message': 'Login failed'}), 500

    @staticmethod
    def verify_challenge():
        """Verify the ZKP challenge response"""
        try:
            data = request.get_json()
            student_id = data.get('student_id')
            challenge = data.get('challenge')
            proof = data.get('proof')
            
            if not all([student_id, challenge, proof]):
                return jsonify({'message': 'Missing required fields'}), 400
                
            voter = Voter.query.filter_by(student_id=student_id).first()
            if not voter:
                return jsonify({'message': 'Invalid credentials'}), 401
                
            # Verify proof
            if voter.verify_zkp_proof(proof, challenge):
                # Generate JWT token
                token = jwt.encode(
                    {
                        'student_id': voter.student_id,
                        'exp': datetime.utcnow() + timedelta(hours=1)
                    },
                    current_app.config['JWT_SECRET_KEY'],
                    algorithm='HS256'
                )
                return jsonify({
                    'token': token,
                    'voter': {
                        'student_id': voter.student_id,
                        'firstName': voter.firstName,
                        'lastName': voter.lastName,
                        'student_email': voter.student_email
                    }
                }), 200
            else:
                return jsonify({'message': 'Authentication failed'}), 401
                
        except Exception as e:
            current_app.logger.error(f"Challenge verification error: {str(e)}")
            return jsonify({'message': 'Authentication failed'}), 401
    
    @staticmethod
    def get_current_voter():
        """Get currently authenticated voter"""
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                raise Unauthorized('Missing or invalid token')
            
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
                    raise Unauthorized('Voter not found')
                
                return jsonify({
                    'student_id': voter.student_id,
                    'firstName': voter.firstName,
                    'lastName': voter.lastName,
                    'student_email': voter.student_email,
                    'college_id': voter.college_id,
                    'status': voter.status
                }), 200
                
            except jwt.ExpiredSignatureError:
                raise Unauthorized('Token expired')
            except jwt.InvalidTokenError:
                raise Unauthorized('Invalid token')
                
        except Unauthorized as e:
            return jsonify({'message': str(e)}), 401
        except Exception as e:
            current_app.logger.error(f"Get current voter error: {str(e)}")
            return jsonify({'message': str(e)}), 500