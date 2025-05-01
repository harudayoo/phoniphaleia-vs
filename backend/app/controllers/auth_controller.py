from flask import request, jsonify, current_app
from werkzeug.exceptions import Unauthorized
from app.models.voter import Voter
from app.models.admin import Admin
import jwt
from datetime import datetime, timedelta
import json
from app import db

import os
from werkzeug.utils import secure_filename
import uuid

class AuthController:
    
    UPLOAD_FOLDER = 'uploads/photos'  # Define the folder for photo uploads
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}  # Define allowed file extensions
    
    @staticmethod
    def register():
        try:
            data = request.form.to_dict()
            photo = request.files.get('photo')
            photo_metadata = json.loads(request.form.get('photo_metadata', '{}'))

            current_app.logger.info(f"Received data: {data}")
            current_app.logger.info(f"Photo metadata: {photo_metadata}")

            # Validate input
            required_fields = [
                'student_id', 'student_email', 'password', 'first_name',
                'last_name', 'gender', 'date_of_birth', 'address_field',
                'status', 'college_id', 'program', 'major'
            ]
            if not all(k in data for k in required_fields):
                return jsonify({"message": "Missing required fields"}), 400

            # Check for existing user
            if Voter.query.filter_by(student_id=data['student_id']).first():
                return jsonify({"message": "Student ID already registered"}), 409

            if Voter.query.filter_by(student_email=data['student_email']).first():
                return jsonify({"message": "Email already registered"}), 409

            # Handle date parsing
            try:
                date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d')
            except ValueError:
                return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400

            # Calculate age
            age = AuthController.calculate_age(date_of_birth)

            # Handle photo upload
            photo_path = None
            if photo and AuthController.allowed_file(photo.filename):
                unique_filename = f"{uuid.uuid4().hex}_{secure_filename(photo.filename)}"
                photo_path = os.path.join(AuthController.UPLOAD_FOLDER, unique_filename)
                os.makedirs(AuthController.UPLOAD_FOLDER, exist_ok=True)
                photo.save(photo_path)
            else:
                return jsonify({"message": "Invalid or missing photo file"}), 400

            # Fallback for missing metadata
            if not photo_metadata:
                photo_metadata = {
                    "name": photo.filename if photo else "unknown",
                    "size": os.path.getsize(photo_path) if photo_path else 0,
                    "type": photo.mimetype if photo else "unknown"
                }

            # Create new voter
            new_voter = Voter(
                student_id=data['student_id'],
                student_email=data['student_email'],
                college_id=data['college_id'],
                lastname=data['last_name'],
                firstname=data['first_name'],
                middlename=data.get('middle_name', ''),
                status=data['status'],
                program=data['program'],
                major=data['major'],
                sex=data['gender'][0].upper(),
                address=data['address_field'],
                dateofbirth=date_of_birth,
                age=age,
                photo_path=photo_path,
                id_metadata=json.dumps(photo_metadata)
            )

            # Handle password
            new_voter.set_password(data['password'])

            # Save to database
            try:
                current_app.logger.info("Adding new voter to DB")
                db.session.add(new_voter)
                db.session.commit()
                current_app.logger.info("DB commit successful")
            except Exception as db_error:
                current_app.logger.error(f"Database error: {str(db_error)}")
                return jsonify({"message": "Database error occurred"}), 500

            return jsonify({"message": "Registration successful"}), 201

        except Exception as e:
            current_app.logger.error(f"Registration error: {str(e)}")
            return jsonify({"message": "Registration failed. Please check your input."}), 500
        
    @staticmethod
    def login():
        """Login with student ID and password"""
        try:
            data = request.get_json()
            student_id = data.get('student_id')
            password = data.get('password')
            
            if not student_id or not password:
                return jsonify({'message': 'Student ID and password required'}), 400
                
            voter = Voter.query.filter_by(student_id=student_id).first()
            if not voter:
                return jsonify({'message': 'Invalid credentials'}), 401
            
            # Verify password
            if not voter.check_password(password):
                return jsonify({'message': 'Invalid credentials'}), 401
                
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
                    'first_name': voter.first_name,
                    'last_name': voter.last_name,
                    'student_email': voter.student_email
                }
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
                        'first_name': voter.first_name,
                        'last_name': voter.last_name,
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
                    'first_name': voter.first_name,
                    'last_name': voter.last_name,
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
        
    @staticmethod
    def allowed_file(filename):
        """Check if the file has an allowed extension."""
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in AuthController.ALLOWED_EXTENSIONS

    @staticmethod
    def calculate_age(date_of_birth):
        """Calculate age in years from date_of_birth."""
        today = datetime.today()
        age = today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
        return age

    @staticmethod
    def admin_register():
        try:
            data = request.get_json()
            required_fields = [
                'id_number', 'email', 'lastname', 'firstname', 'username', 'password'
            ]
            if not all(k in data and data[k] for k in required_fields):
                return jsonify({"message": "Missing required fields"}), 400

            # Check for existing email or username
            if Admin.query.filter_by(email=data['email']).first():
                return jsonify({"message": "Email already registered"}), 409
            if Admin.query.filter_by(username=data['username']).first():
                return jsonify({"message": "Username already taken"}), 409
            if Admin.query.filter_by(id_number=data['id_number']).first():
                return jsonify({"message": "ID Number already registered"}), 409

            # Create new admin
            new_admin = Admin(
                id_number=data['id_number'],
                email=data['email'],
                lastname=data['lastname'],
                firstname=data['firstname'],
                middlename=data.get('middlename', ''),
                username=data['username'],
            )
            new_admin.password_raw = data['password']  # <-- use password_raw setter

            db.session.add(new_admin)
            db.session.commit()

            return jsonify({"message": "Admin registration successful"}), 201

        except Exception as e:
            current_app.logger.error(f"Admin registration error: {str(e)}")
            return jsonify({"message": "Registration failed. Please check your input."}), 500