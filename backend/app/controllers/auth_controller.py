# backend/app/controllers/auth_controller.py
import jwt
import datetime
import hashlib
from flask import request, jsonify, current_app
from werkzeug.exceptions import BadRequest, Unauthorized, Conflict
from app.models.voter import Voter, db
from app.services.zkp.prover import ZKPProver
from app.services.zkp.verifier import ZKPVerifier
from marshmallow import Schema, fields, validate, ValidationError

class RegisterSchema(Schema):
    student_id = fields.String(required=True, validate=validate.Regexp(r'^[0-9]{4}-[0-9]{5}$'))
    student_email = fields.Email(required=True)
    firstName = fields.String(required=True)
    lastName = fields.String(required=True)
    middleName = fields.String(allow_none=True)
    college_id = fields.Integer(required=True)
    password_hash = fields.String(required=True)
    zkp_commitment = fields.String(required=True)

class AuthController:
    @staticmethod
    def register():
        """Register a new voter with secure credentials"""
        try:
            # Validate input data
            data = request.get_json()
            schema = RegisterSchema()
            errors = schema.validate(data)
            if errors:
                return jsonify({"message": "Validation error", "errors": errors}), 400
            
            # Check if student ID already exists
            existing_voter = Voter.query.filter_by(student_id=data['student_id']).first()
            if existing_voter:
                return jsonify({"message": "Student ID already registered"}), 409
            
            # Check if email already exists
            existing_email = Voter.query.filter_by(student_email=data['student_email']).first()
            if existing_email:
                return jsonify({"message": "Email already registered"}), 409
            
            # Create new voter
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
            
            # Save to database
            db.session.add(new_voter)
            db.session.commit()
            
            return jsonify({
                "message": "Registration successful",
                "student_id": new_voter.student_id
            }), 201
            
        except ValidationError as e:
            return jsonify({"message": "Validation error", "errors": e.messages}), 400
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Registration error: {str(e)}")
            return jsonify({"message": str(e)}), 500

    @staticmethod
    def login():
        """Login with zk-SNARK authentication"""
        try:
            data = request.get_json()
            
            # Validate request data
            if not all(k in data for k in ('student_id', 'password_hash')):
                raise BadRequest('Missing required fields')
            
            # Find voter
            voter = Voter.query.filter_by(student_id=data['student_id']).first()
            if not voter:
                return jsonify({'message': 'Invalid credentials'}), 400
            
            # Check if password hash matches
            if voter.password != data['password_hash']:
                return jsonify({'message': 'Invalid credentials'}), 400
            
            # Generate ZKP proof
            prover = ZKPProver()
            proof, public_inputs = prover.generate_proof(
                voter.student_id,
                data['password_hash'],
                voter.zkp_commitment
            )
            
            # Verify proof
            verifier = ZKPVerifier()
            is_valid = verifier.verify_proof(proof, public_inputs)
            
            if not is_valid:
                return jsonify({'message': 'ZKP verification failed'}), 400
            
            # Generate JWT token for authenticated session
            token = jwt.encode(
                {
                    'student_id': voter.student_id,
                    'college_id': voter.college_id,
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
                },
                current_app.config['JWT_SECRET_KEY'],
                algorithm='HS256'
            )
            
            return jsonify({
                'message': 'Login successful',
                'token': token,
                'voter': {
                    'student_id': voter.student_id,
                    'firstName': voter.firstName,
                    'lastName': voter.lastName,
                    'student_email': voter.student_email,
                    'college_id': voter.college_id
                }
            }), 200
        except Exception as e:
            current_app.logger.error(f"Login error: {str(e)}")
            return jsonify({'message': str(e)}), 500
    
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