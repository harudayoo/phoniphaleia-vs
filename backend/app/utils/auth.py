"""
Authentication and Authorization utilities for the application
"""
import jwt
from functools import wraps
from flask import request, jsonify, current_app
from app.models.admin import Admin
from app.models.trusted_authority import TrustedAuthority
from app.services.authentication_service import AuthenticationService
import logging

logger = logging.getLogger(__name__)

def admin_required(f):
    """
    Decorator to require admin authentication
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization token'}), 401
            
        token = auth_header.split(' ')[1]
        
        try:
            # Decode the token
            payload = jwt.decode(
                token, 
                current_app.config['JWT_SECRET_KEY'], 
                algorithms=['HS256']
            )
            
            # Check if it's an admin token
            if payload.get('role') != 'admin':
                return jsonify({'error': 'Admin privileges required'}), 403
                
            # Check if admin exists
            admin_id = payload.get('admin_id')
            admin = Admin.query.get(admin_id)
            if not admin:
                return jsonify({'error': 'Admin not found'}), 401
                
            # Pass the admin to the function
            return f(*args, **kwargs)
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except (jwt.InvalidTokenError, Exception) as e:
            logger.error(f"Auth error: {str(e)}")
            return jsonify({'error': 'Invalid token'}), 401
            
    return decorated

def trusted_authority_required(f):
    """
    Decorator to require trusted authority authentication using challenge-response
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Get the authentication data from the request
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        authority_id = data.get('authorityId')
        challenge = data.get('challenge')
        response_data = data.get('response')
        public_key_fingerprint = data.get('publicKeyFingerprint')
        
        if not authority_id or not challenge or not response_data or not public_key_fingerprint:
            return jsonify({'error': 'Missing authentication data'}), 400
            
        # Verify if this is a valid trusted authority
        authority = TrustedAuthority.query.get(authority_id)
        if not authority:
            return jsonify({'error': 'Trusted authority not found'}), 401
            
        # Validate the challenge response
        is_valid = AuthenticationService.validate_response(
            authority_id=authority_id,
            challenge=challenge,
            response=response_data,
            public_key_fingerprint=public_key_fingerprint
        )
        
        if not is_valid:
            return jsonify({'error': 'Invalid authentication response'}), 401
            
        # Authentication successful, clean up expired challenges
        AuthenticationService.cleanup_expired_challenges()
        
        # Pass the trusted authority to the function
        return f(*args, **kwargs)
    
    return decorated
