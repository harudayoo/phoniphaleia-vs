from flask import jsonify, request
from app.models.trusted_authority import TrustedAuthority
from app.services.auth.challenge_response import AuthenticationService
from app import db
import logging

logger = logging.getLogger(__name__)

class TrustedAuthorityController:
    @staticmethod
    def create_trusted_authority():
        try:
            data = request.json
            authority = TrustedAuthority(
                authority_name=data['authority_name'],
                contact_info=data.get('contact_info')
            )
            db.session.add(authority)
            db.session.commit()
            return jsonify({
                'authority_id': authority.authority_id,
                'authority_name': authority.authority_name,
                'contact_info': authority.contact_info
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
            
    @staticmethod
    def request_challenge():
        """
        Generate a challenge for trusted authority authentication
        """
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({"error": "No data provided"}), 400
                
            authority_id = data.get('authorityId')
            
            if not authority_id:
                return jsonify({"error": "Authority ID required"}), 400
                
            # Check if authority exists
            authority = TrustedAuthority.query.get(authority_id)
            if not authority:
                return jsonify({"error": "Trusted authority not found"}), 404
                
            # Generate a challenge for this authority
            challenge = AuthenticationService.generate_challenge(authority_id)
            
            return jsonify({
                "challenge": challenge,
                "expiresIn": AuthenticationService._challenge_ttl
            }), 200
            
        except Exception as e:
            logger.error(f"Error generating challenge: {str(e)}")
            return jsonify({"error": f"Failed to generate challenge: {str(e)}"}), 500
            
    @staticmethod
    def get_trusted_authority(authority_id):
        """
        Get information about a trusted authority
        """
        try:
            authority = TrustedAuthority.query.get(authority_id)
            if not authority:
                return jsonify({"error": "Trusted authority not found"}), 404
                
            return jsonify({
                'authority_id': authority.authority_id,
                'authority_name': authority.authority_name,
                'contact_info': authority.contact_info
            }), 200
            
        except Exception as e:
            logger.error(f"Error retrieving trusted authority: {str(e)}")
            return jsonify({"error": f"Failed to retrieve trusted authority: {str(e)}"}), 500

    @staticmethod
    def get_all_trusted_authorities():
        """
        Get all trusted authorities
        """
        try:
            authorities = TrustedAuthority.query.all()
            return jsonify([{
                'authority_id': auth.authority_id,
                'authority_name': auth.authority_name,
                'contact_info': auth.contact_info
            } for auth in authorities]), 200
            
        except Exception as e:
            logger.error(f"Error retrieving all trusted authorities: {str(e)}")
            return jsonify({"error": f"Failed to retrieve trusted authorities: {str(e)}"}), 500
