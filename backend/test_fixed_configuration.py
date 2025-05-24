#!/usr/bin/env python3
"""
Test the fixed crypto configuration to ensure end-to-end functionality works.
This verifies that the fix allows proper key reconstruction and decryption.
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
from phe import paillier

def test_fixed_configuration(crypto_id=50):
    """
    Test the fixed crypto configuration for end-to-end functionality.
    
    Args:
        crypto_id: The ID of the crypto config to test
    """
    
    print(f"🧪 TESTING FIXED CRYPTO CONFIG {crypto_id}")
    print("=" * 60)
    
    app = create_app()
    with app.app_context():
        # Get the configuration
        config = CryptoConfig.query.filter_by(crypto_id=crypto_id).first()
        if not config:
            print(f"❌ Crypto configuration {crypto_id} not found.")
            return False
            
        print(f'✅ Found Crypto Config ID: {config.crypto_id} (Election: {config.election_id})')
        
        # Parse metadata and public key
        meta = json.loads(config.meta_data)
        security_data = meta.get('security_data', {})
        public_key_data = json.loads(config.public_key)
        
        n = int(public_key_data.get('n', 0))
        g = int(public_key_data.get('g', 0))
        stored_p = int(security_data.get('prime', 0))
        
        print(f'📊 Configuration Details:')
        print(f'  Public key n: {n}')
        print(f'  Public key g: {g}')
        print(f'  Stored prime p: {stored_p}')
        
        # Test 1: Verify the stored prime is correct
        print(f'\n🔍 TEST 1: Verify stored prime consistency')
        if n % stored_p == 0:
            stored_q = n // stored_p
            print(f'  ✅ Stored p is a valid factor of n')
            print(f'  Calculated q: {stored_q}')
            print(f'  Verification: p × q = {stored_p * stored_q} == n = {stored_p * stored_q == n}')
        else:
            print(f'  ❌ Stored p is NOT a valid factor of n')
            return False
        
        # Test 2: Reconstruct key from shares
        print(f'\n🔑 TEST 2: Key reconstruction from shares')
        key_shares = KeyShare.query.filter_by(crypto_id=config.crypto_id).all()
        
        if len(key_shares) < 2:
            print(f'  ❌ Not enough key shares found ({len(key_shares)})')
            return False
            
        print(f'  Found {len(key_shares)} key shares')
        
        # Parse shares
        prime_modulus = int(meta.get('prime_modulus') or security_data.get('prime_modulus'))
        parsed_shares = []
        
        for i, share in enumerate(key_shares):
            share_str = share.share_value
            if ':' in share_str:
                x_str, y_hex = share_str.split(':', 1)
                x = int(x_str)
                y = int(y_hex, 16)
                share_obj = shamirs.share(x, y, prime_modulus)
                parsed_shares.append(share_obj)
                print(f'    Share {i+1}: x={x}, y={hex(y)[:20]}...')
        
        # Reconstruct the secret
        try:
            reconstructed_p = shamirs.interpolate(parsed_shares)
            print(f'  ✅ Successfully reconstructed p: {reconstructed_p}')
            
            # Verify it matches stored p
            if reconstructed_p == stored_p:
                print(f'  ✅ Reconstructed p matches stored p')
            else:
                print(f'  ❌ Reconstructed p does NOT match stored p')
                print(f'     Stored:       {stored_p}')
                print(f'     Reconstructed: {reconstructed_p}')
                return False
                
        except Exception as e:
            print(f'  ❌ Failed to reconstruct key: {e}')
            return False
        
        # Test 3: Create Paillier keys and test encryption/decryption
        print(f'\n🔐 TEST 3: Paillier encryption/decryption test')
        
        try:
            # Create Paillier public key
            public_key = paillier.PaillierPublicKey(n)
            print(f'  ✅ Created Paillier public key')
            
            # For private key, we need p and q
            p = reconstructed_p
            q = n // p
            
            # Verify p < q (python-paillier convention)
            if p > q:
                p, q = q, p
                print(f'  📋 Swapped p and q to ensure p < q')
            
            private_key = paillier.PaillierPrivateKey(public_key, p, q)
            print(f'  ✅ Created Paillier private key')
            
            # Test encryption/decryption
            test_value = 42
            encrypted = public_key.encrypt(test_value)
            print(f'  ✅ Encrypted test value {test_value}')
            
            decrypted = private_key.decrypt(encrypted)
            print(f'  ✅ Decrypted value: {decrypted}')
            
            if decrypted == test_value:
                print(f'  ✅ Encryption/decryption test PASSED')
            else:
                print(f'  ❌ Encryption/decryption test FAILED')
                print(f'     Expected: {test_value}, Got: {decrypted}')
                return False
                
        except Exception as e:
            print(f'  ❌ Paillier key creation/testing failed: {e}')
            return False
        
        # Test 4: Test with multiple values including homomorphic operations
        print(f'\n🧮 TEST 4: Homomorphic operations test')
        
        try:
            # Test basic homomorphic addition
            val1, val2 = 10, 15
            enc1 = public_key.encrypt(val1)
            enc2 = public_key.encrypt(val2)
            
            # Homomorphic addition
            enc_sum = enc1 + enc2
            dec_sum = private_key.decrypt(enc_sum)
            
            expected_sum = val1 + val2
            print(f'  Homomorphic addition: {val1} + {val2} = {dec_sum} (expected {expected_sum})')
            
            if dec_sum == expected_sum:
                print(f'  ✅ Homomorphic addition test PASSED')
            else:
                print(f'  ❌ Homomorphic addition test FAILED')
                return False
            
            # Test scalar multiplication
            scalar = 3
            enc_mult = enc1 * scalar
            dec_mult = private_key.decrypt(enc_mult)
            
            expected_mult = val1 * scalar
            print(f'  Scalar multiplication: {val1} * {scalar} = {dec_mult} (expected {expected_mult})')
            
            if dec_mult == expected_mult:
                print(f'  ✅ Scalar multiplication test PASSED')
            else:
                print(f'  ❌ Scalar multiplication test FAILED')
                return False
                
        except Exception as e:
            print(f'  ❌ Homomorphic operations test failed: {e}')
            return False
        
        print(f'\n🎉 ALL TESTS PASSED! Configuration {crypto_id} is working correctly.')
        return True

if __name__ == "__main__":
    success = test_fixed_configuration(crypto_id=50)
    
    if success:
        print(f'\n✅ SUCCESS: The fix has been verified and the crypto configuration is fully functional!')
    else:
        print(f'\n❌ FAILURE: There are still issues with the crypto configuration.')
