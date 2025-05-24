#!/usr/bin/env python3

import requests
import json
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app import create_app, db
from app.models.crypto_config import CryptoConfig
import shamirs

def debug_shamir_reconstruction():
    """Debug the Shamir secret sharing reconstruction process"""
    
    app = create_app()
    with app.app_context():
        # Get crypto config for election 55
        election_id = 55
        crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
        
        if not crypto_config:
            print(f"No crypto config found for election {election_id}")
            return
            
        print(f"=== CRYPTO CONFIG DEBUG FOR ELECTION {election_id} ===")
        print(f"Public Key: {crypto_config.public_key}")
        print(f"Meta Data: {crypto_config.meta_data}")
        
        # Parse metadata
        meta_json = json.loads(crypto_config.meta_data)
        print(f"\n=== PARSED META DATA ===")
        for key, value in meta_json.items():
            if isinstance(value, dict):
                print(f"{key}:")
                for sub_key, sub_value in value.items():
                    print(f"  {sub_key}: {sub_value}")
            else:
                print(f"{key}: {value}")
        
        # Get the Shamir modulus
        shamir_prime = None
        search_locations = [
            ('meta_data.prime_modulus', meta_json.get('prime_modulus')),
            ('meta_data.prime', meta_json.get('prime')),
            ('meta_data.security_data.prime_modulus', meta_json.get('security_data', {}).get('prime_modulus')),
            ('meta_data.security_data.prime', meta_json.get('security_data', {}).get('prime')),
            ('meta_data.modulus', meta_json.get('modulus')),
            ('meta_data.prime_mod', meta_json.get('prime_mod'))
        ]
        
        print(f"\n=== SHAMIR MODULUS SEARCH ===")
        for location, value in search_locations:
            print(f"{location}: {value}")
            if value:
                try:
                    shamir_prime = int(value)
                    print(f"✓ Found Shamir modulus at {location}: {shamir_prime}")
                    break
                except (ValueError, TypeError):
                    print(f"✗ Invalid format at {location}")
        
        if not shamir_prime:
            print("✗ No Shamir modulus found in crypto config")
            return
        
        # Get expected p
        expected_p = None
        if 'p' in meta_json and meta_json['p']:
            try:
                expected_p = int(meta_json['p'])
                print(f"\n=== EXPECTED P ===")
                print(f"Expected p: {expected_p}")
                print(f"Expected p bits: {expected_p.bit_length()}")
            except (ValueError, TypeError):
                print("Invalid expected p format")
        
        # Test reconstruction with the actual key shares
        correct_shares = [
            '1:92d01a5398b4ba3d0d57c75de4a90458992792da1236b3ae59e78ff1874b6006ef7ecc92c762c8b02cfec239613e2fa485be6386901dee081d25b738154a9daa525c402840423857e31d487eae6977fd9a34efc2cb8acf782f2fce1412040bc716c70f987f7d135c7ff69cd1bba03233e37d87a2deba3350005881af0377caa1125a3fbf7cdc5899f6ba0aaa7d3b163a',
            '2:7eeb909867eab2c7f170ff934b9b4b2f5dfc85c979c2922a37bbeac2f3ebe4ce482d99a78d2bcf3c05c99c08511c688ed9821433a90a0c390d3b808b65bd166605f37d96c48313229bc564ff76df7a60fc09740dc2ca051ec345d1f698b68a25737d5a7172d17edd9a01e8beb6993cdb47a7d297220eca00b8e47ec84343b052975475867881eac5ab02465819c41575',
            '3:c45262ce6da1e9a0ac4ba8a034d6d484fd353e6d8a9c6cdeaaa33ed841f467920f25db127059345b7f6cba8f0f03bd41ffda19a0ffe9e8a8ba933a77038990200de2ae4faac417dcd92e32d675f81cec63eb901b4e4e4a5de7d490631001b4edf9062fd50e7dccdcb13630f6b4a0f760c553ec868a50663fa685e132e2bcdd629df57b67464c30a6623e821abe44afcf'
        ]
        
        print(f"\n=== TESTING RECONSTRUCTION ===")
        print(f"Using Shamir modulus: {shamir_prime} (bits: {shamir_prime.bit_length()})")
        
        # Parse shares
        parsed_shares = []
        for i, share_str in enumerate(correct_shares):
            print(f"\nProcessing share {i+1}: {share_str[:50]}...")
            if ':' in share_str:
                parts = share_str.split(':')
                x = int(parts[0])
                y = int(parts[1], 16)  # Hex to int
                print(f"  x={x}, y={y} (y bits: {y.bit_length()})")
                
                share_obj = shamirs.share(x, y, shamir_prime)
                parsed_shares.append(share_obj)
                print(f"  ✓ Created shamirs.share object")
            else:
                print(f"  ✗ Invalid format")
        
        if len(parsed_shares) >= 2:
            print(f"\n=== ATTEMPTING RECONSTRUCTION ===")
            try:
                reconstructed_p = shamirs.interpolate(parsed_shares)
                print(f"Reconstructed p: {reconstructed_p}")
                print(f"Reconstructed p bits: {reconstructed_p.bit_length()}")
                
                if expected_p:
                    print(f"\n=== COMPARISON ===")
                    print(f"Expected p:     {expected_p}")
                    print(f"Reconstructed p: {reconstructed_p}")
                    print(f"Match: {expected_p == reconstructed_p}")
                    
                    if expected_p != reconstructed_p:
                        print(f"\n=== DIFFERENCE ANALYSIS ===")
                        print(f"Difference: {abs(expected_p - reconstructed_p)}")
                        print(f"Ratio: {reconstructed_p / expected_p if expected_p != 0 else 'N/A'}")
                        
                        # Check if one is a factor of the other
                        if expected_p % reconstructed_p == 0:
                            print(f"Reconstructed p is a factor of expected p (factor: {expected_p // reconstructed_p})")
                        elif reconstructed_p % expected_p == 0:
                            print(f"Expected p is a factor of reconstructed p (factor: {reconstructed_p // expected_p})")
                
                # Test with public key n
                public_key_data = json.loads(crypto_config.public_key)
                n = int(public_key_data.get('n'))
                print(f"\n=== TESTING WITH PUBLIC KEY ===")
                print(f"Public key n: {n}")
                print(f"Public key n bits: {n.bit_length()}")
                print(f"n % reconstructed_p == 0: {n % reconstructed_p == 0}")
                if expected_p:
                    print(f"n % expected_p == 0: {n % expected_p == 0}")
                
            except Exception as e:
                print(f"✗ Reconstruction failed: {e}")
        else:
            print(f"✗ Not enough valid shares ({len(parsed_shares)}/3)")

if __name__ == "__main__":
    debug_shamir_reconstruction()
