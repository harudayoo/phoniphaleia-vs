from flask import request, jsonify, current_app, render_template_string, session
from werkzeug.exceptions import Unauthorized
from app.models.voter import Voter
from app.models.admin import Admin
import jwt
from datetime import datetime, timedelta
import json
from app import db, mail
from flask_mail import Message

import os
from werkzeug.utils import secure_filename
import uuid
import random

OTP_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Your OTP Code</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f9f9f9; }
      .container { background: #fff; padding: 32px; border-radius: 8px; max-width: 400px; margin: 40px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.07);}
      .otp { font-size: 2em; letter-spacing: 8px; color: #2d7ff9; margin: 24px 0; }
      .footer { font-size: 0.9em; color: #888; margin-top: 32px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Your One-Time Password (OTP)</h2>
      <p>Use the code below to continue your authentication process:</p>
      <div class="otp">{{ otp }}</div>
      <p>This code will expire in 5 minutes.</p>
      <div class="footer">
        If you did not request this, please ignore this email.<br/>
        &copy; {{ year }} Phoniphaleia
      </div>
    </div>
  </body>
</html>
"""

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
            if not voter or not voter.check_password(password):
                return jsonify({'message': 'Invalid credentials'}), 401

            # Set session for user
            session['user_type'] = 'voter'
            session['student_id'] = voter.student_id
            session['first_name'] = voter.first_name
            session['last_name'] = voter.last_name
            session['student_email'] = voter.student_email

            # Generate JWT token (optional, for API use)
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
    def logout():
        """Logout user/admin and clear session"""
        session.clear()
        # Optionally, clear cookies by setting them expired (if using cookies for JWT)
        resp = jsonify({'message': 'Logged out'})
        return resp

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
    def send_otp_email(email, otp):
        try:
            html_body = render_template_string(
                OTP_EMAIL_TEMPLATE,
                otp=otp,
                year=datetime.utcnow().year
            )
            msg = Message(
                subject="Your Admin OTP Code",
                recipients=[email],
                body=f"Your OTP code is: {otp}\nThis code will expire in 5 minutes.",
                html=html_body
            )
            mail.send(msg)
        except Exception as e:
            current_app.logger.error(f"Failed to send OTP email: {str(e)}")

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

    @staticmethod
    def admin_login():
        """Admin login with id_number and password, then send OTP"""
        try:
            data = request.get_json()
            id_number = data.get('id_number')
            password = data.get('password')

            if not id_number or not password:
                return jsonify({'message': 'ID Number and password required'}), 400

            admin = Admin.query.filter_by(id_number=id_number).first()
            if admin and admin.verify_password(password):
                # Generate OTP
                otp = f"{random.randint(100000, 999999)}"
                expires_at = datetime.utcnow() + timedelta(minutes=5)
                admin.otp_code = otp
                admin.otp_expires_at = expires_at
                db.session.commit()

                AuthController.send_otp_email(admin.email, otp)

                # Set session for admin (pending OTP verification)
                session['pending_admin_id'] = admin.admin_id

                return jsonify({
                    "admin_id": admin.admin_id,
                    "message": "OTP sent to your email"
                }), 200
            else:
                return jsonify({"message": "Invalid credentials"}), 401

        except Exception as e:
            current_app.logger.error(f"Admin login error: {str(e)}")
            return jsonify({'message': 'Login failed'}), 500

    @staticmethod
    def admin_verify_otp():
        try:
            data = request.get_json()
            admin_id = data.get('admin_id')
            otp = data.get('otp')

            admin = Admin.query.filter_by(admin_id=admin_id).first()
            if not admin or not admin.otp_code or not admin.otp_expires_at:
                return jsonify({"message": "OTP not found"}), 400

            if datetime.utcnow() > admin.otp_expires_at:
                return jsonify({"message": "OTP expired"}), 400

            if admin.otp_code != otp:
                return jsonify({"message": "Invalid OTP"}), 400

            # OTP is valid, clear it and issue JWT
            admin.otp_code = None
            admin.otp_expires_at = None
            db.session.commit()

            payload = {
                "admin_id": admin.admin_id,
                "role": "admin",
                "exp": datetime.utcnow() + timedelta(hours=1)
            }
            jwt_secret = current_app.config['JWT_SECRET_KEY']
            token = jwt.encode(payload, jwt_secret, algorithm="HS256")
            if isinstance(token, bytes):
                token = token.decode('utf-8')

            return jsonify({
                "verified": True,
                "token": token  # <-- JWT for frontend
            }), 200

        except Exception as e:
            current_app.logger.error(f"Admin OTP verification error: {str(e)}")
            return jsonify({'message': 'OTP verification failed'}), 500

    @staticmethod
    def admin_resend_otp():
        try:
            data = request.get_json()
            admin_id = data.get('admin_id')
            admin = Admin.query.filter_by(admin_id=admin_id).first()
            if not admin:
                return jsonify({"message": "Admin not found"}), 404

            otp = f"{random.randint(100000, 999999)}"
            expires_at = datetime.utcnow() + timedelta(minutes=5)
            admin.otp_code = otp
            admin.otp_expires_at = expires_at
            db.session.commit()

            AuthController.send_otp_email(admin.email, otp)

            return jsonify({"message": "OTP resent"}), 200

        except Exception as e:
            current_app.logger.error(f"Admin resend OTP error: {str(e)}")
            return jsonify({'message': 'Failed to resend OTP'}), 500