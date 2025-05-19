from flask import Blueprint
from app.controllers.key_share_controller import KeyShareController

key_share_bp = Blueprint('key_share', __name__, url_prefix='/api')

@key_share_bp.route('/key_shares', methods=['POST'])
def create_key_share():
    return KeyShareController.create_key_share()
    
@key_share_bp.route('/key_shares/crypto/<int:crypto_id>', methods=['GET'])
def get_key_shares_by_crypto_id(crypto_id):
    return KeyShareController.get_by_crypto_id(crypto_id)
    
@key_share_bp.route('/key_shares/crypto/<int:crypto_id>/authority/<int:authority_id>', methods=['GET'])
def get_key_share_by_crypto_and_authority(crypto_id, authority_id):
    return KeyShareController.get_by_crypto_and_authority_id(crypto_id, authority_id)
