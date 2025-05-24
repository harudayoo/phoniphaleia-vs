#!/usr/bin/env python3
"""
Debug script to check crypto config metadata and prime modulus issues.
"""

import sys
import os
import json

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app import create_app
from app.models.crypto_config import CryptoConfig
from app.models.election import Election

def debug_crypto_config():
    """Debug the crypto configuration to find the prime issue"""
    
    app = create_app()
    
    with app.app_context():
        print("Debugging Crypto Configuration")
        print("=" * 50)
        
        # Get all crypto configs
        configs = CryptoConfig.query.all()
        
        if not configs:
            print("No crypto configurations found in database")
            return
            
        for config in configs:
            print(f"\nCrypto Config ID: {config.crypto_id}")
            print(f"Election ID: {config.election_id}")
            print(f"Key Type: {config.key_type}")
            print(f"Status: {config.status}")
            
            if config.meta_data:
                try:
                    meta = json.loads(config.meta_data)
                    print(f"Metadata keys: {list(meta.keys())}")
                    
                    # Check for prime in different locations
                    prime_sources = []
                    
                    if 'prime' in meta:
                        prime_sources.append(('meta.prime', meta['prime']))
                    if 'prime_modulus' in meta:
                        prime_sources.append(('meta.prime_modulus', meta['prime_modulus']))
                    
                    if 'security_data' in meta and meta['security_data']:
                        sec_data = meta['security_data']
                        if 'prime' in sec_data:
                            prime_sources.append(('meta.security_data.prime', sec_data['prime']))
                        if 'prime_modulus' in sec_data:
                            prime_sources.append(('meta.security_data.prime_modulus', sec_data['prime_modulus']))
                    
                    print(f"Found {len(prime_sources)} prime sources:")
                    for source, value in prime_sources:
                        try:
                            prime_int = int(value)
                            print(f"  {source}: {prime_int.bit_length()} bits (value: {str(prime_int)[:50]}...)")
                        except:
                            print(f"  {source}: Invalid format")
                    
                    # Check public key
                    if config.public_key:
                        try:
                            pub_key = json.loads(config.public_key)
                            if 'n' in pub_key:
                                n = int(pub_key['n'])
                                print(f"Public key n: {n.bit_length()} bits")
                                
                                # Test if any prime divides n
                                for source, value in prime_sources:
                                    try:
                                        prime_int = int(value)
                                        divides = (n % prime_int == 0)
                                        print(f"  {source} divides n: {divides}")
                                    except:
                                        pass
                        except Exception as e:
                            print(f"Error parsing public key: {e}")
                            
                except Exception as e:
                    print(f"Error parsing metadata: {e}")
            
            print("-" * 30)

if __name__ == "__main__":
    debug_crypto_config()
