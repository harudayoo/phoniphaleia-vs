#!/usr/bin/env python3
"""
Examine the existing crypto configuration in detail to determine
if it's using the old φ(n) format or the new prime p format.
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

def examine_crypto_config():
    """Examine the crypto configuration in detail."""
    
    print("🔍 DETAILED EXAMINATION OF CRYPTO CONFIGURATION")
    print("=" * 60)
    
    app = create_app()
    with app.app_context():
        config = CryptoConfig.query.first()
        if not config:
            print("❌ No crypto configurations found in the database.")
            return
            
        print(f'Crypto Config ID: {config.crypto_id}')
        print(f'Election ID: {config.election_id}')
        print(f'Key Type: {config.key_type}')
        print(f'Status: {config.status}')
        print(f'Created: {config.created_at}')
        
        # Parse public key
        try:
            public_key_data = json.loads(config.public_key)
            n = int(public_key_data.get('n', 0))
            print(f'\nPublic Key (n): {n}')
            print(f'n bit length: {n.bit_length()}')
        except Exception as e:
            print(f'❌ Could not parse public key: {e}')
            return
        
        # Parse metadata
        if not config.meta_data:
            print("❌ No metadata found.")
            return
            
        try:
            meta = json.loads(config.meta_data)
            print(f'\n📋 METADATA:')
            print(f'  Crypto type: {meta.get("crypto_type")}')
            print(f'  Personnel: {meta.get("n_personnel")}')
            print(f'  Threshold: {meta.get("threshold")}')
            print(f'  Created: {meta.get("creation_timestamp")}')
            
            # Check for prime values
            prime_value = meta.get('prime')
            prime_modulus = meta.get('prime_modulus')
            
            if prime_value:
                print(f'  Prime: {prime_value}')
                print(f'  Prime bit length: {int(prime_value).bit_length()}')
            
            if prime_modulus:
                print(f'  Prime modulus: {prime_modulus}')
                print(f'  Prime modulus bit length: {int(prime_modulus).bit_length()}')
            
            # Check security_data
            security_data = meta.get('security_data', {})
            if security_data:
                print(f'\n🔒 SECURITY DATA:')
                for key, value in security_data.items():
                    if key in ['p', 'q', 'n', 'p_times_q']:
                        print(f'  {key}: {value}')
                        if key == 'p':
                            p_value = int(value)
                            print(f'    p bit length: {p_value.bit_length()}')
                            # Check if p divides n
                            if n % p_value == 0:
                                q_value = n // p_value
                                print(f'    ✅ p divides n correctly')
                                print(f'    q = n/p: {q_value}')
                                print(f'    q bit length: {q_value.bit_length()}')
                            else:
                                print(f'    ❌ p does not divide n - this is the φ(n) issue!')
                    elif key == 'prime_modulus':
                        print(f'  {key}: {value}')
                        print(f'    Prime modulus bit length: {int(value).bit_length()}')
                    else:
                        print(f'  {key}: {str(value)[:100]}...' if len(str(value)) > 100 else f'  {key}: {value}')
              # Check what's stored in the prime field vs security_data
            print(f'\n🔍 ANALYSIS:')
            
            # Get the actual value that would be used for reconstruction
            stored_prime = meta.get('prime') or security_data.get('prime') or security_data.get('p')
            
            if stored_prime:
                stored_value = int(stored_prime)
                print(f'Stored "prime" value: {stored_value}')
                print(f'Stored value bit length: {stored_value.bit_length()}')
                
                # Test if this is actually prime p or φ(n)
                if n % stored_value == 0:
                    q = n // stored_value
                    print(f'✅ CORRECT: Stored value is prime p (n = p × q = {stored_value} × {q})')
                    print(f'✅ This configuration uses the NEW format correctly!')
                else:
                    # Check if it might be φ(n) = (p-1)(q-1)
                    # For φ(n), we'd expect φ(n) ≈ n (slightly less)
                    # Use integer arithmetic to avoid float overflow
                    n_ratio = (stored_value * 10) // n  # Multiply by 10 to get decimal precision
                    if stored_value < n and n_ratio >= 8:  # φ(n) is typically close to n (>80% of n)
                        print(f'❌ PROBLEM: Stored value appears to be φ(n), not prime p')
                        print(f'❌ This configuration uses the OLD format!')
                        print(f'   Stored value is {n_ratio/10:.1f}% of n, indicating it\'s φ(n)')
                        
                        # Try to calculate the actual primes from φ(n)
                        print(f'\n🧮 ATTEMPTING TO DERIVE PRIMES FROM φ(n):')
                        phi_n = stored_value
                        print(f'φ(n) = {phi_n}')
                        print(f'n = {n}')
                        
                        # p + q = n - φ(n) + 1
                        sum_pq = n - phi_n + 1
                        print(f'p + q = n - φ(n) + 1 = {sum_pq}')
                        
                        # Discriminant = (p+q)² - 4n
                        discriminant = sum_pq * sum_pq - 4 * n
                        print(f'Discriminant = (p+q)² - 4n = {discriminant}')
                        
                        if discriminant >= 0:
                            # Use integer square root for large numbers
                            def isqrt(n):
                                if n < 0:
                                    return None
                                if n == 0:
                                    return 0
                                x = n
                                while True:
                                    y = (x + n // x) // 2
                                    if y >= x:
                                        return x
                                    x = y
                            
                            sqrt_discriminant = isqrt(discriminant)
                            if sqrt_discriminant is not None and sqrt_discriminant * sqrt_discriminant == discriminant:
                                p_candidate = (sum_pq + sqrt_discriminant) // 2
                                q_candidate = (sum_pq - sqrt_discriminant) // 2
                                
                                if p_candidate * q_candidate == n:
                                    print(f'✅ FOUND PRIMES: p = {p_candidate}, q = {q_candidate}')
                                    print(f'   p bit length: {p_candidate.bit_length()}')
                                    print(f'   q bit length: {q_candidate.bit_length()}')
                                else:
                                    print(f'❌ Could not derive correct primes')
                            else:
                                print(f'❌ Discriminant is not a perfect square')
                        else:
                            print(f'❌ Negative discriminant')
                    else:                        # Check if it's actually a smaller prime (the real p)
                        if stored_value.bit_length() < n.bit_length() - 100:  # Much smaller than n
                            print(f'✅ CORRECT: Stored value appears to be prime p (much smaller than n)')
                            print(f'✅ This configuration uses the NEW format correctly!')
                        else:
                            print(f'❌ Stored value doesn\'t appear to be prime p or φ(n)')
                            print(f'   Stored value ratio to n: {n_ratio/10:.1f}%')
            else:
                print(f'❌ No prime value found in configuration')
                
        except Exception as e:
            print(f'❌ Could not parse metadata: {e}')
            import traceback
            traceback.print_exc()
        
        # Check key shares
        key_shares = KeyShare.query.filter_by(crypto_id=config.crypto_id).all()
        print(f'\n🔑 KEY SHARES: Found {len(key_shares)} key shares')
        for i, share in enumerate(key_shares):
            print(f'  Share {i+1}: Authority ID {share.authority_id}, Length: {len(share.share_value)}')

if __name__ == "__main__":
    examine_crypto_config()
