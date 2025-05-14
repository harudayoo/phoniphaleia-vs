from flask import jsonify, request
from app.models.crypto_config import CryptoConfig
from app import db
import secrets
from phe import paillier
from typing import List

# Simple Shamir's Secret Sharing implementation (Library not inspected for vulnerability testing)
def shamir_split(secret: int, n: int, k: int) -> List[str]:
    # This is a placeholder for a real SSS implementation
    # For demo, just split secret into n random shares (not secure!)
    shares = [secrets.token_hex(32) for _ in range(n)]
    return shares

class CryptoConfigController:
    @staticmethod
    def create_crypto_config():
        try:
            data = request.json
            crypto = CryptoConfig(
                election_id=data['election_id'],
                public_key=data['public_key']
            )
            db.session.add(crypto)
            db.session.commit()
            return jsonify({
                'crypto_id': crypto.crypto_id,
                'election_id': crypto.election_id,
                'public_key': crypto.public_key
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def generate_key_pair():
        try:
            data = request.json
            n_personnel = int(data.get('n_personnel', 3))
            threshold = int(data.get('threshold', n_personnel))
            # Generate Paillier keypair
            public_key, private_key = paillier.generate_paillier_keypair()
            # Use Shamir's Secret Sharing to split private key (Split private_key.p)
            priv_key_int = int(private_key.p)
            shares = shamir_split(priv_key_int, n_personnel, threshold)
            return jsonify({
                'public_key': str(public_key.n),
                'private_shares': shares,
                'threshold': threshold
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
