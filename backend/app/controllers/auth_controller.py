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
        """Login with student ID and password, then send OTP"""
        try:
            data = request.get_json()
            student_id = data.get('student_id')
            password = data.get('password')
            
            if not student_id or not password:
                return jsonify({'message': 'Student ID and password required'}), 400
                
            voter = Voter.query.filter_by(student_id=student_id).first()
            if not voter or not voter.check_password(password):
                return jsonify({'message': 'Invalid credentials'}), 401

            # Use the generate_otp method instead of setting fields directly
            otp = voter.generate_otp(6, 300)  # 6 digits, 5 minutes expiration
            db.session.commit()

            # Send OTP email
            AuthController.send_voter_otp_email(voter.student_email, otp)

            # Set session for user (pending OTP verification)
            session['pending_voter_id'] = voter.student_id
            session.permanent = True  # Make session permanent to apply timeout

            return jsonify({
                "student_id": voter.student_id,
                "message": "OTP sent to your email"
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Login error: {str(e)}")
            return jsonify({'message': 'Login failed'}), 500

    @staticmethod
    def logout():
        """Logout user/admin and clear session"""
        session.clear()
        resp = jsonify({'message': 'Logged out'})
        return resp

    @staticmethod
    def verify_otp():
        """Verify the voter's OTP"""
        try:
            data = request.get_json()
            student_id = data.get('student_id')
            otp = data.get('otp')

            if not all([student_id, otp]):
                return jsonify({'message': 'Missing required fields'}), 400
                
            voter = Voter.query.filter_by(student_id=student_id).first()
            if not voter or not voter.otp_code or not voter.otp_expires_at:
                return jsonify({'message': 'OTP not found or invalid user'}), 400

            # Use the model's verify_otp method
            if not voter.verify_otp(otp):
                # Check specific reason for failure
                if datetime.utcnow() > voter.otp_expires_at:
                    return jsonify({'message': 'OTP expired'}), 400
                else:
                    return jsonify({'message': 'Invalid OTP'}), 400

            # OTP is now verified, store changes to database
            voter.otp_code = None
            voter.otp_expires_at = None
            voter.verified_at = datetime.utcnow()  # This is redundant as verify_otp already sets it
            db.session.commit()

            # Generate JWT token
            token = jwt.encode(
                {
                    'student_id': voter.student_id,
                    'user_type': 'voter',
                    'exp': datetime.utcnow() + timedelta(hours=24)  # Extend token lifetime
                },
                current_app.config['JWT_SECRET_KEY'],
                algorithm='HS256'
            )
            
            # Set session variables
            session['user_type'] = 'voter'
            session['student_id'] = voter.student_id
            session['first_name'] = voter.firstname
            session['last_name'] = voter.lastname
            session['student_email'] = voter.student_email
            
            # Create response with token
            response = jsonify({
                'verified': True,
                'token': token,
                'voter': {
                    'student_id': voter.student_id,
                    'first_name': voter.firstname,
                    'last_name': voter.lastname,
                    'student_email': voter.student_email
                }
            })
            
            # Set a cookie with the token - this adds redundancy for authentication
            response.set_cookie(
                'user_token',
                token,
                httponly=True,
                secure=current_app.config.get('SESSION_COOKIE_SECURE', False),
                samesite=current_app.config.get('SESSION_COOKIE_SAMESITE', 'Lax'),
                max_age=86400  # 24 hours in seconds
            )
            
            return response, 200
                
        except Exception as e:
            current_app.logger.error(f"OTP verification error: {str(e)}")
            return jsonify({'message': 'Verification failed'}), 500

    @staticmethod
    def resend_otp():
        """Resend OTP to user's email"""
        try:
            data = request.get_json()
            student_id = data.get('student_id')
            
            voter = Voter.query.filter_by(student_id=student_id).first()
            if not voter:
                return jsonify({"message": "Voter not found"}), 404

            # Use the model's generate_otp method
            otp = voter.generate_otp(6, 300)  # 6 digits, 5 minutes expiration
            db.session.commit()

            AuthController.send_voter_otp_email(voter.student_email, otp)

            return jsonify({"message": "OTP resent"}), 200

        except Exception as e:
            current_app.logger.error(f"Resend OTP error: {str(e)}")
            return jsonify({'message': 'Failed to resend OTP'}), 500
    
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
                    'status': voter.status,
                    'photo_url': '/uploads/photos/' + os.path.basename(voter.photo_path).replace('\\', '/').replace('\\', '/') if voter.photo_path else None
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
    def send_voter_otp_email(email, otp):
        """Send OTP email to voters"""
        try:
            # Read the OTP email template from the external file
            template_path = os.path.join(current_app.root_path, '..', '..', 'frontend', 'src', 'templates', 'OtpEmail.tsx')
            
            with open(template_path, 'r') as template_file:
                template_content = template_file.read()
                
            # Render the template with the variables
            html_body = render_template_string(
                template_content,
                otp=otp,
                year=datetime.utcnow().year
            )
            
            msg = Message(
                subject="Your Verification Code",
                recipients=[email],
                body=f"Your verification code is: {otp}\nThis code will expire in 5 minutes.",
                html=html_body
            )
            mail.send(msg)
        except FileNotFoundError:
            current_app.logger.error(f"OTP email template not found at: {template_path}")
            # Fallback to plain text email if template is not found
            msg = Message(
                subject="Your Verification Code",
                recipients=[email],
                body=f"Your verification code is: {otp}\nThis code will expire in 5 minutes."
            )
            mail.send(msg)
        except Exception as e:
            current_app.logger.error(f"Failed to send voter OTP email: {str(e)}")

    @staticmethod
    def send_otp_email(email, otp):
        """Send OTP email to admins"""
        try:
            # Read the OTP email template from the external file
            template_path = os.path.join(current_app.root_path, '..', '..', 'frontend', 'src', 'templates', 'OtpEmail.tsx')    
            
            with open(template_path, 'r') as template_file:
                template_content = template_file.read()
                
            # Render the template with the variables
            html_body = render_template_string(
                template_content,
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
        except FileNotFoundError:
            current_app.logger.error(f"OTP email template not found at: {template_path}")
            # Fallback to plain text email if template is not found
            msg = Message(
                subject="Your Admin OTP Code",
                recipients=[email],
                body=f"Your OTP code is: {otp}\nThis code will expire in 5 minutes."
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
            if not admin or not admin.verify_password(password):
                return jsonify({"message": "Invalid credentials"}), 401
                
            # Generate OTP directly - no conditional logic
            otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            expires_at = datetime.utcnow() + timedelta(minutes=5)
            
            # Log the OTP generation
            current_app.logger.info(f"Generating OTP for admin ID {admin.admin_id}: {otp}")
            
            # Set OTP values directly
            admin.otp_code = otp
            admin.otp_expires_at = expires_at
            
            # Explicitly save with transaction handling
            try:
                db.session.commit()
                current_app.logger.info(f"OTP successfully saved for admin ID {admin.admin_id}")
                
                # Double-check OTP was saved correctly
                admin_check = Admin.query.get(admin.admin_id)
                current_app.logger.info(f"Verification - Admin {admin.admin_id} OTP data: code={admin_check.otp_code}, expires_at={admin_check.otp_expires_at}")
            except Exception as db_err:
                db.session.rollback()
                current_app.logger.error(f"Failed to save OTP: {str(db_err)}")
                return jsonify({"message": "Database error"}), 500
                
            # Send OTP email
            try:
                AuthController.send_otp_email(admin.email, otp)
                current_app.logger.info(f"OTP email sent to {admin.email}")
            except Exception as email_err:
                current_app.logger.error(f"Failed to send OTP email: {str(email_err)}")
                # Continue despite email failure - admin can request resend

            # Set session for admin (pending OTP verification)
            session['pending_admin_id'] = admin.admin_id
            session.permanent = True  # Make session permanent to apply timeout

            return jsonify({
                "admin_id": admin.admin_id,
                "message": "OTP sent to your email"
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Admin login error: {str(e)}")
            return jsonify({'message': 'Login failed'}), 500

    @staticmethod
    def admin_verify_otp():
        """Verify the admin's OTP"""
        try:
            data = request.get_json()
            admin_id = data.get('admin_id')
            otp = data.get('otp')
            
            # Add detailed logging
            current_app.logger.info(f"Admin OTP verification attempt: ID={admin_id}, OTP={otp}")
            
            if not all([admin_id, otp]):
                current_app.logger.warning(f"Missing required fields: admin_id={admin_id}, otp={otp}")
                return jsonify({'message': 'Missing required fields'}), 400
            
            # Convert admin_id to int if it's a string
            try:
                admin_id = int(admin_id)
            except (ValueError, TypeError):
                current_app.logger.warning(f"Invalid admin_id format: {admin_id}")
                return jsonify({"message": "Invalid admin ID format"}), 400
                
            # Retrieve admin directly by ID for clarity
            admin = Admin.query.get(admin_id)
            if not admin:
                current_app.logger.warning(f"Admin not found: admin_id={admin_id}")
                return jsonify({"message": "Admin not found"}), 404
            
            # Log the retrieved OTP data
            current_app.logger.info(f"Admin {admin_id} OTP data: code={admin.otp_code}, expires_at={admin.otp_expires_at}")
                
            if not admin.otp_code or not admin.otp_expires_at:
                current_app.logger.warning(f"OTP not set: admin_id={admin_id}, has_otp_code={bool(admin.otp_code)}, has_expiry={bool(admin.otp_expires_at)}")
                return jsonify({"message": "No verification code found. Please request a new one."}), 400

            # Check if OTP is expired
            if datetime.utcnow() > admin.otp_expires_at:
                current_app.logger.warning(f"OTP expired: admin_id={admin_id}")
                return jsonify({"message": "Verification code expired. Please request a new one."}), 400
                    
            # Check if OTP is correct
            if admin.otp_code != otp:
                current_app.logger.warning(f"Invalid OTP: expected={admin.otp_code}, received={otp}")
                return jsonify({"message": "Invalid verification code"}), 400

            # OTP is valid, clear it and issue JWT
            admin.otp_code = None
            admin.otp_expires_at = None
            db.session.commit()
            current_app.logger.info(f"OTP verified successfully for admin ID {admin_id}")
        
            # Use the configured session timeout
            session_timeout = int(current_app.config.get('PERMANENT_SESSION_LIFETIME', 1800).total_seconds())
            
            payload = {
                "admin_id": admin.admin_id,
                "role": "admin",
                "exp": datetime.utcnow() + timedelta(seconds=session_timeout)
            }
            
            jwt_secret = current_app.config['JWT_SECRET_KEY']
            token = jwt.encode(payload, jwt_secret, algorithm="HS256")
            
            if isinstance(token, bytes):
                token = token.decode('utf-8')
                
            return jsonify({
                "verified": True,
                "token": token
            }), 200

        except Exception as e:
            current_app.logger.error(f"Admin OTP verification error: {str(e)}")
            return jsonify({'message': 'OTP verification failed'}), 500

    @staticmethod
    def admin_resend_otp():
        """Resend OTP to admin's email"""
        try:
            data = request.get_json()
            admin_id = data.get('admin_id')
            
            if not admin_id:
                return jsonify({'message': 'Admin ID required'}), 400
                
            # Convert admin_id to int to ensure proper lookup
            try:
                admin_id = int(admin_id)
            except (ValueError, TypeError):
                return jsonify({"message": "Invalid admin ID format"}), 400
                
            # Get admin directly by ID
            admin = Admin.query.get(admin_id)
            if not admin:
                return jsonify({"message": "Admin not found"}), 404

            # Generate OTP directly - no conditional logic
            otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            expires_at = datetime.utcnow() + timedelta(minutes=5)
            
            # Log OTP generation
            current_app.logger.info(f"Regenerating OTP for admin ID {admin_id}: {otp}")
            
            # Set OTP values
            admin.otp_code = otp
            admin.otp_expires_at = expires_at
            
            # Commit with transaction handling
            try:
                db.session.commit()
                current_app.logger.info(f"Resent OTP successfully saved for admin ID {admin_id}")
            except Exception as db_err:
                db.session.rollback()
                current_app.logger.error(f"Failed to save resent OTP: {str(db_err)}")
                return jsonify({"message": "Database error"}), 500

            # Send OTP email
            AuthController.send_otp_email(admin.email, otp)

            return jsonify({"message": "OTP resent"}), 200

        except Exception as e:
            current_app.logger.error(f"Admin resend OTP error: {str(e)}")
            return jsonify({'message': 'Failed to resend OTP'}), 500

    @staticmethod
    def refresh_session():
        """Refresh the session and extend token validity for voter or admin"""
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'message': 'Missing or invalid token'}), 401

            token = auth_header.split(' ')[1]

            try:
                # Decode the current token without verifying expiration
                payload = jwt.decode(
                    token,
                    current_app.config['JWT_SECRET_KEY'],
                    algorithms=['HS256'],
                    options={"verify_exp": False}
                )

                # Check if this is an admin or voter token
                if payload.get('role') == 'admin':
                    admin_id = payload.get('admin_id')
                    if not admin_id:
                        return jsonify({'message': 'Invalid token payload'}), 401
                    from app.models.admin import Admin
                    admin = Admin.query.get(admin_id)
                    if not admin:
                        return jsonify({'message': 'Admin no longer exists'}), 401
                    session_timeout = int(current_app.config.get('PERMANENT_SESSION_LIFETIME', 1800).total_seconds())
                    new_payload = {
                        "admin_id": admin.admin_id,
                        "role": "admin",
                        "exp": datetime.utcnow() + timedelta(seconds=session_timeout)
                    }
                    new_token = jwt.encode(
                        new_payload,
                        current_app.config['JWT_SECRET_KEY'],
                        algorithm="HS256"
                    )
                    if isinstance(new_token, bytes):
                        new_token = new_token.decode('utf-8')
                    return jsonify({
                        "token": new_token,
                        "expires_in": session_timeout
                    }), 200

                # Voter token (legacy: user_type == 'voter')
                elif payload.get('user_type') == 'voter' or payload.get('role') == 'voter':
                    student_id = payload.get('student_id')
                    if not student_id:
                        return jsonify({'message': 'Invalid token payload'}), 401
                    from app.models.voter import Voter
                    voter = Voter.query.get(student_id)
                    if not voter:
                        return jsonify({'message': 'Voter no longer exists'}), 401
                    session_timeout = int(current_app.config.get('PERMANENT_SESSION_LIFETIME', 1800).total_seconds())
                    new_payload = {
                        "student_id": voter.student_id,
                        "user_type": "voter",
                        "exp": datetime.utcnow() + timedelta(seconds=session_timeout)
                    }
                    new_token = jwt.encode(
                        new_payload,
                        current_app.config['JWT_SECRET_KEY'],
                        algorithm="HS256"
                    )
                    if isinstance(new_token, bytes):
                        new_token = new_token.decode('utf-8')
                    return jsonify({
                        "token": new_token,
                        "expires_in": session_timeout
                    }), 200

                else:
                    return jsonify({'message': 'Invalid token type'}), 401

            except jwt.InvalidTokenError:
                return jsonify({'message': 'Invalid token'}), 401

        except Exception as e:
            current_app.logger.error(f"Session refresh error: {str(e)}")
            return jsonify({'message': 'Failed to refresh session'}), 500