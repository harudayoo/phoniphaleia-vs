from flask import Blueprint, request, jsonify
from app.controllers.crypto_config_controller import CryptoConfigController
from app.utils.auth import admin_required, trusted_authority_required

crypto_config_bp = Blueprint('crypto_config', __name__, url_prefix='/api')

@crypto_config_bp.route('/crypto_configs', methods=['POST'])
def create_crypto_config():
    return CryptoConfigController.create_crypto_config()
    
@crypto_config_bp.route('/crypto_configs/store-with-shares', methods=['POST'])
@admin_required
def store_crypto_config_with_shares():
    """Store complete crypto configuration with key shares after election creation"""
    # Use the CryptoConfigController method for consistency
    return CryptoConfigController.store_election_crypto_data()

@crypto_config_bp.route('/crypto_configs/temp-election-id', methods=['GET'])
@admin_required
def generate_temp_election_id():
    return CryptoConfigController.generate_temp_election_id()

@crypto_config_bp.route('/crypto_configs/generate', methods=['POST'])
@admin_required
def generate_crypto_key_pair():
    return CryptoConfigController.generate_key_pair()
    
@crypto_config_bp.route('/crypto_configs/generate-in-memory', methods=['POST'])
@admin_required
def generate_in_memory_key_pair():
    """Generate key pair without storing in the database"""
    # Use the CryptoConfigController method directly for consistency
    return CryptoConfigController.generate_key_pair_in_memory()

@crypto_config_bp.route('/crypto_configs/distribute', methods=['POST'])
@admin_required
def distribute_key_shares():
    return CryptoConfigController.distribute_key_shares()

@crypto_config_bp.route('/crypto_configs/election/<int:election_id>', methods=['GET'])
def get_crypto_config_by_election(election_id):
    return CryptoConfigController.get_by_election_id(election_id)
    
@crypto_config_bp.route('/crypto_configs/<int:crypto_id>/update-election', methods=['PUT'])
@admin_required
def update_crypto_election_id(crypto_id):
    data = request.json
    new_election_id = data.get('election_id')
    if not new_election_id:
        return jsonify({'error': 'Election ID is required'}), 400
    return CryptoConfigController.update_election_id(crypto_id, new_election_id)

@crypto_config_bp.route('/crypto_configs/verify-shares', methods=['POST'])
@admin_required
def verify_key_shares():
    """Endpoint to verify if provided key shares can successfully reconstruct a key"""
    try:
        data = request.get_json()
        crypto_id = data.get('crypto_id')
        shares = data.get('shares', [])
        
        if not crypto_id or not shares:
            return jsonify({'error': 'Missing required fields'}), 400
            
        result = CryptoConfigController.verify_key_shares(crypto_id, shares)
        return jsonify({'valid': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@crypto_config_bp.route('/crypto_configs/reconstruct-key', methods=['POST'])
@admin_required
def reconstruct_key():
    """Endpoint to reconstruct a private key from shares (highly sensitive operation)"""
    try:
        data = request.get_json()
        crypto_id = data.get('crypto_id')
        shares = data.get('shares', [])
        
        if not crypto_id or not shares:
            return jsonify({'error': 'Missing required fields'}), 400
            
        result = CryptoConfigController.reconstruct_key(crypto_id, shares)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@crypto_config_bp.route('/crypto_configs/check-key-shares-status', methods=['GET'])
@admin_required
def check_key_shares_status():
    """Check status of key shares for an election"""
    return CryptoConfigController.check_key_shares_status()

@crypto_config_bp.route('/crypto_configs/security-keys', methods=['GET'])
def get_security_keys():
    from app.controllers.crypto_config_controller import CryptoConfigController
    return CryptoConfigController.get_all_security_keys()

@crypto_config_bp.route('/crypto_configs/<int:election_id>/trusted-authorities', methods=['GET'])
def get_trusted_authorities_for_election(election_id):
    from app.controllers.crypto_config_controller import CryptoConfigController
    return CryptoConfigController.get_trusted_authorities_for_election(election_id)
