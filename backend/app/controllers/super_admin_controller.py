from flask import request, jsonify, current_app, session
from app.models.super_admin import SuperAdmin
from app.models.admin import Admin
from app.models.pending_admin import PendingAdmin
from app import db, mail
from flask_mail import Message
import jwt
from datetime import datetime, timedelta
import random
from functools import wraps

class SuperAdminController:
    
    @staticmethod
    def super_admin_required(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'message': 'Missing or invalid token'}), 401
            
            token = auth_header.split(' ')[1]
            
            try:
                payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
                
                # Check if payload contains role field and it's 'super_admin'
                if 'role' not in payload or payload['role'] != 'super_admin':
                    return jsonify({'message': 'Insufficient permissions'}), 403
                
                super_admin = SuperAdmin.query.get(payload['super_admin_id'])
                if not super_admin:
                    return jsonify({'message': 'Super admin not found'}), 401
                
                # Set last_login to current time
                super_admin.last_login = datetime.utcnow()
                db.session.commit()
                
                return f(*args, **kwargs)
                
            except jwt.ExpiredSignatureError:
                return jsonify({'message': 'Token expired'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'message': 'Invalid token'}), 401
                
        return decorated
    
    @staticmethod
    def login():
        """Super Admin login with username/email and password, then send OTP"""
        try:
            data = request.get_json()
            username_or_email = data.get('username_or_email')
            password = data.get('password')
            
            if not username_or_email or not password:
                return jsonify({'message': 'Username/Email and password required'}), 400
            
            # Check if input is email or username
            if '@' in username_or_email:
                super_admin = SuperAdmin.query.filter_by(email=username_or_email).first()
            else:
                super_admin = SuperAdmin.query.filter_by(username=username_or_email).first()
                
            if not super_admin or not super_admin.verify_password(password):
                return jsonify({"message": "Invalid credentials"}), 401
                
            # Generate OTP
            otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            expires_at = datetime.utcnow() + timedelta(minutes=5)
            
            # Log the OTP generation
            current_app.logger.info(f"Generating OTP for super admin ID {super_admin.super_admin_id}: {otp}")
            
            # Set OTP values
            super_admin.otp_code = otp
            super_admin.otp_expires_at = expires_at
            
            # Save with transaction handling
            try:
                db.session.commit()
                current_app.logger.info(f"OTP successfully saved for super admin ID {super_admin.super_admin_id}")
            except Exception as db_err:
                db.session.rollback()
                current_app.logger.error(f"Failed to save OTP: {str(db_err)}")
                return jsonify({"message": "Database error"}), 500
                
            # Send OTP email
            try:
                msg = Message(
                    subject="Your Super Admin OTP Code",
                    recipients=[super_admin.email],
                    body=f"Your OTP code is: {otp}\nThis code will expire in 5 minutes."
                )
                mail.send(msg)
                current_app.logger.info(f"OTP email sent to {super_admin.email}")
            except Exception as email_err:
                current_app.logger.error(f"Failed to send OTP email: {str(email_err)}")
                # Continue despite email failure - admin can request resend

            # Set session for admin (pending OTP verification)
            session['pending_super_admin_id'] = super_admin.super_admin_id
            session.permanent = True  # Make session permanent to apply timeout

            return jsonify({
                "super_admin_id": super_admin.super_admin_id,
                "message": "OTP sent to your email"
            }), 200
            
        except Exception as e:
            current_app.logger.error(f"Super admin login error: {str(e)}")
            return jsonify({'message': 'Login failed'}), 500
            
    @staticmethod
    def verify_otp():
        """Verify the super admin's OTP"""
        try:
            data = request.get_json()
            super_admin_id = data.get('super_admin_id')
            otp = data.get('otp')
            
            # Add detailed logging
            current_app.logger.info(f"Super admin OTP verification attempt: ID={super_admin_id}, OTP={otp}")
            
            if not all([super_admin_id, otp]):
                current_app.logger.warning(f"Missing required fields: super_admin_id={super_admin_id}, otp={otp}")
                return jsonify({'message': 'Missing required fields'}), 400
            
            # Convert super_admin_id to int if it's a string
            try:
                super_admin_id = int(super_admin_id)
            except (ValueError, TypeError):
                current_app.logger.warning(f"Invalid super_admin_id format: {super_admin_id}")
                return jsonify({"message": "Invalid super admin ID format"}), 400
                
            # Retrieve super admin directly by ID for clarity
            super_admin = SuperAdmin.query.get(super_admin_id)
            if not super_admin:
                current_app.logger.warning(f"Super admin not found: super_admin_id={super_admin_id}")
                return jsonify({"message": "Super admin not found"}), 404
            
            # Log the retrieved OTP data
            current_app.logger.info(f"Super admin {super_admin_id} OTP data: code={super_admin.otp_code}, expires_at={super_admin.otp_expires_at}")
                
            if not super_admin.otp_code or not super_admin.otp_expires_at:
                current_app.logger.warning(f"OTP not set: super_admin_id={super_admin_id}, has_otp_code={bool(super_admin.otp_code)}, has_expiry={bool(super_admin.otp_expires_at)}")
                return jsonify({"message": "No verification code found. Please request a new one."}), 400

            # Check if OTP is expired
            if datetime.utcnow() > super_admin.otp_expires_at:
                current_app.logger.warning(f"OTP expired: super_admin_id={super_admin_id}")
                return jsonify({"message": "Verification code expired. Please request a new one."}), 400
                    
            # Check if OTP is correct
            if super_admin.otp_code != otp:
                current_app.logger.warning(f"Invalid OTP: expected={super_admin.otp_code}, received={otp}")
                return jsonify({"message": "Invalid verification code"}), 400

            # OTP is valid, clear it and issue JWT
            super_admin.otp_code = None
            super_admin.otp_expires_at = None
            db.session.commit()
            current_app.logger.info(f"OTP verified successfully for super admin ID {super_admin_id}")
        
            # Use the configured session timeout
            session_timeout = int(current_app.config.get('PERMANENT_SESSION_LIFETIME', 1800).total_seconds())
            
            payload = {
                "super_admin_id": super_admin.super_admin_id,
                "role": "super_admin",
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
            current_app.logger.error(f"Super admin OTP verification error: {str(e)}")
            return jsonify({'message': 'OTP verification failed'}), 500
            
    @staticmethod
    def resend_otp():
        """Resend OTP to super admin's email"""
        try:
            data = request.get_json()
            super_admin_id = data.get('super_admin_id')
            
            if not super_admin_id:
                return jsonify({'message': 'Super admin ID required'}), 400
                
            # Convert super_admin_id to int to ensure proper lookup
            try:
                super_admin_id = int(super_admin_id)
            except (ValueError, TypeError):
                return jsonify({"message": "Invalid super admin ID format"}), 400
                
            # Get super admin directly by ID
            super_admin = SuperAdmin.query.get(super_admin_id)
            if not super_admin:
                return jsonify({"message": "Super admin not found"}), 404

            # Generate OTP directly - no conditional logic
            otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            expires_at = datetime.utcnow() + timedelta(minutes=5)
            
            # Log OTP generation
            current_app.logger.info(f"Regenerating OTP for super admin ID {super_admin_id}: {otp}")
            
            # Set OTP values
            super_admin.otp_code = otp
            super_admin.otp_expires_at = expires_at
            
            # Commit with transaction handling
            try:
                db.session.commit()
                current_app.logger.info(f"Resent OTP successfully saved for super admin ID {super_admin_id}")
            except Exception as db_err:
                db.session.rollback()
                current_app.logger.error(f"Failed to save resent OTP: {str(db_err)}")
                return jsonify({"message": "Database error"}), 500            # Send OTP email
            try:
                msg = Message(
                    subject="Your Super Admin OTP Code",
                    recipients=[super_admin.email],
                    body=f"Your OTP code is: {otp}\nThis code will expire in 5 minutes."
                )
                mail.send(msg)
            except Exception as email_err:
                current_app.logger.error(f"Failed to send OTP email: {str(email_err)}")
                return jsonify({"message": "OTP generated but email could not be sent. Please contact support."}), 500

            return jsonify({"message": "OTP resent"}), 200

        except Exception as e:
            current_app.logger.error(f"Super admin resend OTP error: {str(e)}")
            return jsonify({'message': 'Failed to resend OTP'}), 500
            
    @staticmethod
    def logout():
        """Logout super admin and clear session"""
        session.clear()
        resp = jsonify({'message': 'Logged out'})
        return resp
            
    @staticmethod
    @super_admin_required
    def get_pending_admins():
        """Get all pending admin registration requests"""
        try:
            pending_admins = PendingAdmin.query.filter_by(status='pending').all()
            return jsonify([pending_admin.to_dict() for pending_admin in pending_admins]), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching pending admins: {str(e)}")
            return jsonify([]), 200  # Return empty array on error to prevent frontend issues
            
    @staticmethod
    @super_admin_required
    def get_pending_admin(pending_id):
        """Get a specific pending admin by ID"""
        try:
            pending_admin = PendingAdmin.query.get(pending_id)
            if not pending_admin:
                return jsonify({'message': 'Pending admin not found'}), 404
                
            return jsonify(pending_admin.to_dict()), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching pending admin: {str(e)}")
            return jsonify({'message': 'Failed to fetch pending admin'}), 500
            
    @staticmethod
    @super_admin_required
    def approve_pending_admin(pending_id):
        """Approve a pending admin registration request"""
        try:
            pending_admin = PendingAdmin.query.get(pending_id)
            if not pending_admin:
                return jsonify({'message': 'Pending admin not found'}), 404
                
            # Check if username, email, or id_number already exists
            if Admin.query.filter_by(email=pending_admin.email).first():
                return jsonify({"message": "Email already registered"}), 409
            if Admin.query.filter_by(username=pending_admin.username).first():
                return jsonify({"message": "Username already taken"}), 409
            if Admin.query.filter_by(id_number=pending_admin.id_number).first():
                return jsonify({"message": "ID Number already registered"}), 409
                
            # Create new admin from pending admin
            new_admin = Admin(
                id_number=pending_admin.id_number,
                email=pending_admin.email,
                lastname=pending_admin.lastname,
                firstname=pending_admin.firstname,
                middlename=pending_admin.middlename,
                username=pending_admin.username,
                password=pending_admin.password,  # Already hashed, so directly assign
                role='admin'
            )
            
            # Update pending admin status
            pending_admin.status = 'approved'
            
            # Save to database
            db.session.add(new_admin)
            db.session.commit()
            
            # Send email notification to the approved admin
            try:
                msg = Message(
                    subject="Your Admin Registration Has Been Approved",
                    recipients=[pending_admin.email],
                    body=f"Dear {pending_admin.full_name()},\n\nYour admin registration request has been approved. You can now log in to the admin dashboard with your credentials.\n\nBest regards,\nThe System Team"
                )
                mail.send(msg)
            except Exception as email_err:
                current_app.logger.error(f"Failed to send approval email: {str(email_err)}")
            
            return jsonify({
                'message': 'Admin registration approved',
                'admin_id': new_admin.admin_id
            }), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error approving pending admin: {str(e)}")
            return jsonify({'message': 'Failed to approve pending admin'}), 500
            
    @staticmethod
    @super_admin_required
    def reject_pending_admin(pending_id):
        """Reject a pending admin registration request"""
        try:
            data = request.get_json()
            rejection_reason = data.get('reason', 'Your registration request has been rejected by the super admin.')
            
            pending_admin = PendingAdmin.query.get(pending_id)
            if not pending_admin:
                return jsonify({'message': 'Pending admin not found'}), 404
                
            # Update pending admin status
            pending_admin.status = 'rejected'
            pending_admin.notes = rejection_reason
            
            # Save to database
            db.session.commit()
            
            # Send email notification to the rejected admin
            try:
                msg = Message(
                    subject="Your Admin Registration Has Been Rejected",
                    recipients=[pending_admin.email],
                    body=f"Dear {pending_admin.full_name()},\n\nYour admin registration request has been rejected for the following reason:\n\n{rejection_reason}\n\nIf you believe this is in error, please contact the system administrator.\n\nBest regards,\nThe System Team"
                )
                mail.send(msg)
            except Exception as email_err:
                current_app.logger.error(f"Failed to send rejection email: {str(email_err)}")
            
            return jsonify({
                'message': 'Admin registration rejected',
                'pending_id': pending_id
            }), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error rejecting pending admin: {str(e)}")
            return jsonify({'message': 'Failed to reject pending admin'}), 500
    
    @staticmethod
    @super_admin_required
    def get_admins():
        """Get all approved admins"""
        try:
            admins = Admin.query.all()
            result = []
            
            for admin in admins:
                result.append({
                    'admin_id': admin.admin_id,
                    'email': admin.email,
                    'id_number': admin.id_number,
                    'lastname': admin.lastname,
                    'firstname': admin.firstname,
                    'middlename': admin.middlename,
                    'username': admin.username,
                    'role': admin.role,
                    'full_name': admin.full_name(),
                    'created_at': admin.created_at.isoformat() if admin.created_at else None,
                    'updated_at': admin.updated_at.isoformat() if admin.updated_at else None,
                    'last_login': admin.last_login.isoformat() if admin.last_login else None
                })
                
            return jsonify(result), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching admins: {str(e)}")
            return jsonify({'message': 'Failed to fetch admins'}), 500
            
    @staticmethod
    @super_admin_required
    def get_admin(admin_id):
        """Get a specific admin by ID"""
        try:
            admin = Admin.query.get(admin_id)
            if not admin:
                return jsonify({'message': 'Admin not found'}), 404
                
            return jsonify({
                'admin_id': admin.admin_id,
                'email': admin.email,
                'id_number': admin.id_number,
                'lastname': admin.lastname,
                'firstname': admin.firstname,
                'middlename': admin.middlename,
                'username': admin.username,
                'full_name': admin.full_name(),
                'created_at': admin.created_at.isoformat() if admin.created_at else None,
                'updated_at': admin.updated_at.isoformat() if admin.updated_at else None,
                'last_login': admin.last_login.isoformat() if admin.last_login else None
            }), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching admin: {str(e)}")
            return jsonify({'message': 'Failed to fetch admin'}), 500
    
    @staticmethod
    @super_admin_required
    def delete_admin(admin_id):
        """Delete an admin account permanently"""
        try:
            admin = Admin.query.get(admin_id)
            if not admin:
                return jsonify({'message': 'Admin not found'}), 404
                
            # Delete the admin from database
            db.session.delete(admin)
            db.session.commit()
            
            return jsonify({
                'message': 'Admin account deleted successfully',
                'admin_id': admin_id
            }), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting admin: {str(e)}")
            return jsonify({'message': 'Failed to delete admin'}), 500
    
    @staticmethod
    @super_admin_required
    def get_profile():
        """Get super admin profile information"""
        try:
            auth_header = request.headers.get('Authorization')
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            
            super_admin = SuperAdmin.query.get(payload['super_admin_id'])
            if not super_admin:
                return jsonify({'message': 'Super admin not found'}), 404
                
            return jsonify({
                'super_admin_id': super_admin.super_admin_id,
                'email': super_admin.email,
                'id_number': super_admin.id_number,
                'lastname': super_admin.lastname,
                'firstname': super_admin.firstname,
                'middlename': super_admin.middlename,
                'username': super_admin.username,
                'full_name': super_admin.full_name(),
                'created_at': super_admin.created_at.isoformat() if super_admin.created_at else None,
                'updated_at': super_admin.updated_at.isoformat() if super_admin.updated_at else None,
                'last_login': super_admin.last_login.isoformat() if super_admin.last_login else None
            }), 200
        except Exception as e:
            current_app.logger.error(f"Error fetching super admin profile: {str(e)}")
            return jsonify({'message': 'Failed to fetch profile'}), 500
            
    @staticmethod
    @super_admin_required
    def update_profile():
        """Update super admin profile information"""
        try:
            data = request.get_json()
            auth_header = request.headers.get('Authorization')
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            
            super_admin = SuperAdmin.query.get(payload['super_admin_id'])
            if not super_admin:
                return jsonify({'message': 'Super admin not found'}), 404
                
            # Update fields if provided
            if 'email' in data:
                # Check if email is already in use by another admin
                existing = SuperAdmin.query.filter(
                    SuperAdmin.email == data['email'], 
                    SuperAdmin.super_admin_id != super_admin.super_admin_id
                ).first()
                
                if existing:
                    return jsonify({'message': 'Email already in use'}), 409
                    
                super_admin.email = data['email']
                
            if 'firstname' in data:
                super_admin.firstname = data['firstname']
                
            if 'lastname' in data:
                super_admin.lastname = data['lastname']
                
            if 'middlename' in data:
                super_admin.middlename = data['middlename']
                
            if 'username' in data:
                # Check if username is already in use by another admin
                existing = SuperAdmin.query.filter(
                    SuperAdmin.username == data['username'], 
                    SuperAdmin.super_admin_id != super_admin.super_admin_id
                ).first()
                
                if existing:
                    return jsonify({'message': 'Username already in use'}), 409
                    
                super_admin.username = data['username']
                
            # Save changes
            db.session.commit()
            
            return jsonify({
                'message': 'Profile updated successfully',
                'super_admin': {
                    'super_admin_id': super_admin.super_admin_id,
                    'email': super_admin.email,
                    'id_number': super_admin.id_number,
                    'lastname': super_admin.lastname,
                    'firstname': super_admin.firstname,
                    'middlename': super_admin.middlename,
                    'username': super_admin.username,
                    'full_name': super_admin.full_name()
                }
            }), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating super admin profile: {str(e)}")
            return jsonify({'message': 'Failed to update profile'}), 500
            
    @staticmethod
    @super_admin_required
    def change_password():
        """Change super admin password"""
        try:
            data = request.get_json()
            current_password = data.get('current_password')
            new_password = data.get('new_password')
            
            if not current_password or not new_password:
                return jsonify({'message': 'Current password and new password required'}), 400
                
            auth_header = request.headers.get('Authorization')
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            
            super_admin = SuperAdmin.query.get(payload['super_admin_id'])
            if not super_admin:
                return jsonify({'message': 'Super admin not found'}), 404
                
            # Verify current password
            if not super_admin.verify_password(current_password):
                return jsonify({'message': 'Current password is incorrect'}), 400
                
            # Update password
            super_admin.password_raw = new_password
            db.session.commit()
            
            return jsonify({'message': 'Password changed successfully'}), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error changing super admin password: {str(e)}")
            return jsonify({'message': 'Failed to change password'}), 500
