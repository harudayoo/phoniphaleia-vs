from flask import Blueprint, request, jsonify
from phe import paillier
import secrets

crypto_bp = Blueprint('crypto', __name__, url_prefix='/api')

@crypto_bp.route('/crypto/generate', methods=['POST'])
def generate_key_pair():
    data = request.json
    n_personnel = data.get('n_personnel', 3)
    # Generate Paillier keypair
    public_key, private_key = paillier.generate_paillier_keypair()
    # For demo: split private key into n_personnel shares (not real threshold, just for demo)
    priv_key_str = str(private_key.p)
    shares = [secrets.token_hex(32) for _ in range(n_personnel)]
    return jsonify({
        'public_key': str(public_key.n),
        'private_shares': shares
    })
