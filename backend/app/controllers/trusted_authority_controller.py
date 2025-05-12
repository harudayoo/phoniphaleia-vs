from flask import jsonify, request
from app.models.trusted_authority import TrustedAuthority
from app import db

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
