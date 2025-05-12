from flask import jsonify, request
from app.models.key_share import KeyShare
from app import db

class KeyShareController:
    @staticmethod
    def create_key_share():
        try:
            data = request.json
            key_share = KeyShare(
                crypto_id=data['crypto_id'],
                authority_id=data['authority_id'],
                share_value=data['share_value']
            )
            db.session.add(key_share)
            db.session.commit()
            return jsonify({
                'key_share_id': key_share.key_share_id,
                'crypto_id': key_share.crypto_id,
                'authority_id': key_share.authority_id,
                'share_value': key_share.share_value
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
