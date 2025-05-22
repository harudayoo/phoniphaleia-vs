from flask import jsonify, request, current_app
from werkzeug.exceptions import Unauthorized
import jwt
from app.models.voter import Voter
import os
from flask_mail import Message

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
                # Get the base URL for serving photos (from config or default to local path)
                base_url = current_app.config.get('PHOTO_BASE_URL', f"{request.url_root}uploads/photos/")
                photo_url = None
                
                # Always return photo_url as /uploads/photos/<filename>
                if voter.photo_path:
                    # Normalize slashes and extract only the filename
                    normalized_path = voter.photo_path.replace('\\', '/').replace('\\', '/')
                    filename = os.path.basename(normalized_path)
                    photo_url = f"/uploads/photos/{filename}"
                
                return jsonify({
                    'student_id': voter.student_id,
                    'first_name': voter.firstname,
                    'last_name': voter.lastname,
                    'student_email': voter.student_email,
                    'college_id': voter.college_id,
                    'status': voter.status,
                    'photo_url': photo_url,
                    'id_metadata': voter.id_metadata
                }), 200
                
            except jwt.ExpiredSignatureError:
                return jsonify({'message': 'Token expired'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'message': 'Invalid token'}), 401
                
        except Exception as e:
            current_app.logger.error(f"Get user info error: {str(e)}")
            return jsonify({'message': str(e)}), 500

    @staticmethod
    def submit_support_ticket():
        """Submit a support ticket and send email to system support address."""
        try:
            data = request.get_json()
            name = data.get('name')
            email = data.get('email')
            subject = data.get('subject')
            message = data.get('message')
            if not all([name, email, subject, message]):
                return jsonify({'message': 'All fields are required.'}), 400
            # Compose email
            msg = Message(
                subject=f"[Support Ticket] {subject}",
                recipients=["usep.phoniphaleia.voting@gmail.com"],
                body=f"Support ticket from {name} <{email}>\n\n{message}"
            )
            from app import mail
            mail.send(msg)
            return jsonify({'message': 'Support ticket submitted successfully.'}), 200
        except Exception as e:
            current_app.logger.error(f"Support ticket error: {str(e)}")
            return jsonify({'message': 'Failed to submit support ticket.'}), 500

    @staticmethod
    def update_photo():
        from flask import request, jsonify, current_app
        from app.models.voter import Voter
        from app import db
        import os, jwt, time, json
        # Try to get token from Authorization header or cookie
        user_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not user_token:
            user_token = request.cookies.get('voter_token', '')
        if not user_token:
            return jsonify({'message': 'Missing token'}), 401
        try:
            data = jwt.decode(user_token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            student_id = data.get('student_id')
            voter = Voter.query.get(student_id)
            if not voter:
                return jsonify({'message': 'User not found'}), 404
            if 'photo' not in request.files:
                return jsonify({'message': 'No photo uploaded'}), 400
            photo = request.files['photo']
            # Save photo with unique name
            ext = os.path.splitext(photo.filename)[1]
            # Correct path: backend/uploads/photos
            upload_folder = os.path.join(os.path.dirname(current_app.root_path), 'uploads', 'photos')
            os.makedirs(upload_folder, exist_ok=True)
            filename = f"{student_id}_{int(time.time())}{ext}"
            photo_path = os.path.join(upload_folder, filename)
            photo.save(photo_path)
            # Update DB: store relative path and update id_metadata in a consistent JSON format
            voter.photo_path = f"uploads/photos/{filename}"
            voter.id_metadata = json.dumps({
                "filename": filename,
                "upload_time": int(time.time()),
                "extension": ext.lstrip('.')
            })
            db.session.commit()
            return jsonify({'message': 'Photo updated successfully.'}), 200
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'message': f'Failed to update photo: {str(e)}'}), 500

    @staticmethod
    def change_password():
        from flask import request, jsonify, current_app
        from app.models.voter import Voter
        from app import db
        import jwt
        # Handle CORS preflight
        if request.method == 'OPTIONS':
            return '', 200
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        # Get token from Authorization header or cookie
        user_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not user_token:
            user_token = request.cookies.get('voter_token', '')
        if not user_token:
            return jsonify({'message': 'Missing token'}), 401
        try:
            payload = jwt.decode(user_token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            student_id = payload.get('student_id')
            voter = Voter.query.get(student_id)
            if not voter:
                return jsonify({'message': 'User not found'}), 404
            if not voter.check_password(current_password):
                return jsonify({'message': 'Current password is incorrect'}), 400
            if not new_password or len(new_password) < 8:
                return jsonify({'message': 'New password must be at least 8 characters long'}), 400
            voter.set_password(new_password)
            db.session.commit()
            return jsonify({'message': 'Password changed successfully!'}), 200
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'message': f'Failed to change password: {str(e)}'}), 500