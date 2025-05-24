#!/usr/bin/env python3
"""
Debug script to analyze the real key shares and understand what went wrong.
"""

import os
import sys
import json
import shamirs

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app import create_app, db
from app.models.crypto_config import CryptoConfig

def debug_real_shares():
    """Debug the real key shares from the files."""
    
    print("🔍 DEBUGGING REAL KEY SHARES")
    print("=" * 60)
    
    # Read the actual share files
    share_files = [
        "c:\\Users\\cayan\\Documents\\Development-Projects\\phoniphaleia\\key_share_Harold_1.txt",
        "c:\\Users\\cayan\\Documents\\Development-Projects\\phoniphaleia\\key_share_Daniel_2.txt", 
        "c:\\Users\\cayan\\Documents\\Development-Projects\\phoniphaleia\\key_share_Cayan_3.txt"
    ]
    shares_data = []
    for file_path in share_files:
        try:
            with open(file_path, 'r') as f:
                content = f.read().strip()
                # Extract just the share part (after "Key Share:")
                lines = content.split('\n')
                for line in lines:
                    line = line.strip()
                    # Look for lines that match pattern: number:hex_string
                    if ':' in line and not line.startswith('Authority') and not line.startswith('Key Share'):
                        # Check if it starts with a digit
                        if line[0].isdigit():
                            share_str = line
                            shares_data.append(share_str)
                            print(f"Found share: {share_str[:50]}...")
                            break
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
    
    print(f"\nCollected {len(shares_data)} shares")
    
    # Get crypto config from database
    app = create_app()
    with app.app_context():
        crypto_config = CryptoConfig.query.filter_by(election_id=41).first()
        if not crypto_config:
            print("❌ No crypto config found for election 41")
            return
            
        meta_json = json.loads(crypto_config.meta_data)
        public_key_data = json.loads(crypto_config.public_key)
        
        print(f"\n📊 CRYPTO CONFIG ANALYSIS")
        print(f"Election ID: {crypto_config.election_id}")
        print(f"Public key n: {public_key_data.get('n')}")
        print(f"Shamir prime: {meta_json.get('prime')}")
        
        # Parse shares
        shamir_prime = int(meta_json.get('prime'))
        parsed_shares = []
        
        print(f"\n🔧 PARSING SHARES")
        for i, share_str in enumerate(shares_data[:3]):  # Use only first 3 shares
            try:
                x_str, y_hex = share_str.split(':', 1)
                x = int(x_str)
                y = int(y_hex, 16)
                share_obj = shamirs.share(x, y, shamir_prime)
                parsed_shares.append(share_obj)
                
                print(f"Share {i+1}: x={x}, y={y} (hex: {y_hex[:20]}...)")
                print(f"  y value bit length: {y.bit_length()}")
                
            except Exception as e:
                print(f"❌ Error parsing share {i+1}: {e}")
        if len(parsed_shares) >= 2:
            print(f"\n🔨 RECONSTRUCTION ATTEMPT")
            try:
                # Try reconstruction with 2 shares
                reconstructed = shamirs.interpolate(parsed_shares[:2])
                print(f"Reconstructed value: {reconstructed}")
                print(f"Reconstructed bit length: {reconstructed.bit_length()}")
                
                # Compare with public key
                public_n = int(public_key_data.get('n'))
                print(f"\nPublic key n: {public_n}")
                print(f"Public key n bit length: {public_n.bit_length()}")
                
                print(f"\n🧮 MATHEMATICAL ANALYSIS")
                print(f"Reconstructed > n: {reconstructed > public_n}")
                print(f"Reconstructed divides n: {public_n % reconstructed == 0 if reconstructed != 0 else False}")
                
                if reconstructed != 0:
                    if public_n % reconstructed == 0:
                        q = public_n // reconstructed
                        print(f"Other factor q: {q}")
                        print(f"p * q = n: {reconstructed * q == public_n}")
                    else:
                        print("❌ Reconstructed value does not divide n")
                        
                        # Check if maybe the shares were for a different value
                        print(f"\n🔍 ALTERNATIVE ANALYSIS")
                        print(f"Maybe the shared secret was not the Paillier prime p?")
                        
                        # Check if it could be lambda (carmichael function)
                        # For Paillier, lambda = lcm(p-1, q-1)
                        print(f"Could this be lambda (Carmichael function)?")
                        
                        # Let's try to reverse-engineer what was shared
                        print(f"\n🧪 REVERSE ENGINEERING ANALYSIS")
                        
                        # Check if this could be the private key exponent (d) from RSA-like construction
                        print(f"Testing if reconstructed value could be:")
                        
                        # 1. Check if it's the Carmichael function λ(n)
                        # For RSA/Paillier: λ(n) = lcm(p-1, q-1) where n = p*q
                        print(f"1. Carmichael function λ(n):")
                        print(f"   If λ = {reconstructed}, then for encryption e*d ≡ 1 (mod λ)")
                        
                        # 2. Check if it's related to Paillier's mu value
                        # In Paillier: mu = (L(g^λ mod n²))^(-1) mod n, where L(x) = (x-1)/n
                        print(f"2. Related to Paillier mu parameter")
                        
                        # 3. Check if it's some modular inverse
                        print(f"3. Some modular inverse or derived value")
                        
                        # Let's check what happens if we try to factorize n using this value
                        print(f"\n🔨 FACTORIZATION ATTEMPTS")
                        
                        # Try to see if there's a mathematical relationship
                        # Sometimes the shared secret could be phi(n) = (p-1)(q-1)
                        phi_candidate = reconstructed
                        print(f"If reconstructed value is φ(n) = (p-1)(q-1) = {phi_candidate}")
                        
                        # Try to solve for p using quadratic formula if φ(n) is known
                        # We know: n = p*q and φ(n) = (p-1)(q-1) = pq - p - q + 1 = n - p - q + 1
                        # So: p + q = n - φ(n) + 1
                        # And: p*q = n
                        # This gives us a quadratic: t² - (p+q)t + pq = 0
                        sum_pq = public_n - phi_candidate + 1
                        print(f"If φ(n) = {phi_candidate}, then p + q = {sum_pq}")
                        
                        # Quadratic formula: t = ((p+q) ± √((p+q)² - 4pq)) / 2
                        discriminant = sum_pq * sum_pq - 4 * public_n
                        print(f"Discriminant = (p+q)² - 4n = {discriminant}")
                        
                        if discriminant >= 0:
                            import math
                            sqrt_discriminant = math.isqrt(discriminant)
                            if sqrt_discriminant * sqrt_discriminant == discriminant:
                                p_candidate = (sum_pq + sqrt_discriminant) // 2
                                q_candidate = (sum_pq - sqrt_discriminant) // 2
                                
                                print(f"Potential p = {p_candidate}")
                                print(f"Potential q = {q_candidate}")
                                print(f"p * q = {p_candidate * q_candidate}")
                                print(f"Does p * q = n? {p_candidate * q_candidate == public_n}")
                                
                                if p_candidate * q_candidate == public_n:
                                    print(f"✅ SUCCESS! Found the prime factors!")
                                    print(f"p = {p_candidate}")
                                    print(f"q = {q_candidate}")
                                    
                                    # Verify this is correct
                                    calculated_phi = (p_candidate - 1) * (q_candidate - 1)
                                    print(f"Calculated φ(n) = (p-1)(q-1) = {calculated_phi}")
                                    print(f"Does calculated φ(n) match reconstructed? {calculated_phi == reconstructed}")
                                else:
                                    print(f"❌ p * q ≠ n")
                            else:
                                print(f"❌ Discriminant is not a perfect square")
                        else:
                            print(f"❌ Discriminant is negative")
                            
            except Exception as e:
                print(f"❌ Error during reconstruction: {e}")
        
        print(f"\n📋 METADATA STRUCTURE")
        print(json.dumps(meta_json, indent=2))

if __name__ == "__main__":
    debug_real_shares()
