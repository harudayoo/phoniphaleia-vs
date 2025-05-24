#!/usr/bin/env python3
"""
Debug what was actually shared during key generation vs what's stored in security_data.
"""

import os
import sys
import json

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Set required environment variables
os.environ.setdefault('SESSION_TIMEOUT_MINUTES', '30')
os.environ.setdefault('MAIL_PORT', '587')
os.environ.setdefault('MAIL_USE_TLS', 'True')
os.environ.setdefault('MAIL_USE_SSL', 'False')

from app import create_app, db
from app.models.crypto_config import CryptoConfig
from app.models.key_share import KeyShare
import shamirs

def debug_secret_sharing():
    """Debug what was actually shared vs what's stored."""
    
    print("🔍 DEBUGGING SECRET SHARING MISMATCH")
    print("=" * 60)
    
    app = create_app()
    with app.app_context():
        config = CryptoConfig.query.first()
        if not config:
            print("❌ No crypto configurations found.")
            return
            
        print(f'Analyzing Crypto Config ID: {config.crypto_id}')
        
        # Parse metadata
        meta = json.loads(config.meta_data)
        security_data = meta.get('security_data', {})
        
        # Parse public key
        public_key_data = json.loads(config.public_key)
        n = int(public_key_data.get('n', 0))
        
        print(f'Public key n: {n}')
        print(f'n bit length: {n.bit_length()}')
        
        # Get expected values
        expected_p = int(security_data.get('prime', 0))
        expected_q = n // expected_p if expected_p else 0
        expected_p_times_q = int(security_data.get('p_times_q', 0))
        
        print(f'\n📊 EXPECTED VALUES (from security_data):')
        print(f'  Expected p: {expected_p}')
        print(f'  Expected q: {expected_q}')
        print(f'  Expected p × q: {expected_p_times_q}')
        print(f'  Does p × q = n? {expected_p * expected_q == n}')
        
        # Get prime modulus
        prime_modulus = int(meta.get('prime_modulus') or security_data.get('prime_modulus'))
        print(f'  Prime modulus: {prime_modulus}')
        
        # Get key shares and reconstruct
        key_shares = KeyShare.query.filter_by(crypto_id=config.crypto_id).all()
        parsed_shares = []
        
        print(f'\n🔑 PARSING KEY SHARES:')
        for share in key_shares:
            share_str = share.share_value
            print(f'  Share {share.authority_id}: {share_str[:50]}...')
            
            if ':' in share_str:
                x_str, y_hex = share_str.split(':', 1)
                x = int(x_str)
                y = int(y_hex, 16)
                share_obj = shamirs.share(x, y, prime_modulus)
                parsed_shares.append(share_obj)
                print(f'    Parsed: x={x}, y={y}')
        
        # Reconstruct the secret
        reconstructed_secret = shamirs.interpolate(parsed_shares)
        print(f'\n🔓 RECONSTRUCTION RESULTS:')
        print(f'  Reconstructed secret: {reconstructed_secret}')
        print(f'  Reconstructed bit length: {reconstructed_secret.bit_length()}')
        
        # Check what the reconstructed secret could be
        print(f'\n🧪 ANALYSIS:')
        
        # Test 1: Is it the expected p?
        if reconstructed_secret == expected_p:
            print(f'  ✅ Reconstructed secret = expected p')
        else:
            print(f'  ❌ Reconstructed secret ≠ expected p')
            print(f'     Difference: {abs(reconstructed_secret - expected_p)}')
        
        # Test 2: Is it φ(n) = (p-1)(q-1)?
        phi_n = (expected_p - 1) * (expected_q - 1)
        if reconstructed_secret == phi_n:
            print(f'  ✅ Reconstructed secret = φ(n) = (p-1)(q-1)')
            print(f'  📋 This confirms the OLD φ(n) format was used!')
        else:
            print(f'  ❌ Reconstructed secret ≠ φ(n)')
            print(f'     φ(n) = {phi_n}')
            print(f'     Difference: {abs(reconstructed_secret - phi_n)}')
        
        # Test 3: Does it divide n?
        if n % reconstructed_secret == 0:
            other_factor = n // reconstructed_secret
            print(f'  ✅ Reconstructed secret divides n')
            print(f'     n / secret = {other_factor}')
            print(f'     This means the secret is actually a prime factor!')
        else:
            print(f'  ❌ Reconstructed secret does not divide n')
        
        # Test 4: Check if it's close to n (indicating φ(n))
        ratio = (reconstructed_secret * 100) // n
        if ratio > 90:
            print(f'  ⚠️  Reconstructed secret is {ratio}% of n - likely φ(n)')
        elif ratio < 10:
            print(f'  ℹ️  Reconstructed secret is {ratio}% of n - likely a prime factor')
        else:
            print(f'  ❓ Reconstructed secret is {ratio}% of n - unclear what it represents')
        
        # Test 5: Check if there's a pattern in the key generation code
        print(f'\n🔍 CHECKING GENERATION PATTERN:')
        
        # Look at the metadata to see what was originally generated
        print(f'  Metadata creation timestamp: {meta.get("creation_timestamp")}')
        print(f'  All metadata keys: {list(meta.keys())}')
        print(f'  All security_data keys: {list(security_data.keys())}')
        
        # Check if there are multiple prime values stored
        if 'prime' in meta and 'prime' in security_data:
            meta_prime = int(meta['prime'])
            security_prime = int(security_data['prime'])
            if meta_prime != security_prime:
                print(f'  ⚠️  INCONSISTENCY: meta["prime"] ≠ security_data["prime"]')
                print(f'     meta["prime"]: {meta_prime}')
                print(f'     security_data["prime"]: {security_prime}')
                
                # Test which one matches the reconstruction
                if reconstructed_secret == meta_prime:
                    print(f'  ✅ Reconstructed secret matches meta["prime"]')
                elif reconstructed_secret == security_prime:
                    print(f'  ✅ Reconstructed secret matches security_data["prime"]')
            else:
                print(f'  ✅ meta["prime"] = security_data["prime"]')

if __name__ == "__main__":
    debug_secret_sharing()
