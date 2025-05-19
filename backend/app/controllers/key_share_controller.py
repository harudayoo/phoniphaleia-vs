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
    @staticmethod
    def get_by_crypto_id(crypto_id):
        try:
            key_shares = KeyShare.query.filter_by(crypto_id=crypto_id).all()
            shares_data = [{
                'key_share_id': share.key_share_id,
                'crypto_id': share.crypto_id,
                'authority_id': share.authority_id,
                'share_value': share.share_value,
                'created_at': share.created_at.isoformat() if share.created_at else None
            } for share in key_shares]
            
            return jsonify(shares_data), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
            
    @staticmethod
    def get_by_crypto_and_authority_id(crypto_id, authority_id):
        """
        Get a key share by crypto_id and authority_id
        
        Args:
            crypto_id: ID of the crypto configuration
            authority_id: ID of the trusted authority
            
        Returns:
            Key share data as JSON
        """
        try:
            key_share = KeyShare.query.filter_by(
                crypto_id=crypto_id,
                authority_id=authority_id
            ).first()
            
            if not key_share:
                return jsonify({'error': 'Key share not found'}), 404
                
            return jsonify({
                'key_share_id': key_share.key_share_id,
                'crypto_id': key_share.crypto_id,
                'authority_id': key_share.authority_id,
                'share_value': key_share.share_value,
                'created_at': key_share.created_at.isoformat() if key_share.created_at else None
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
