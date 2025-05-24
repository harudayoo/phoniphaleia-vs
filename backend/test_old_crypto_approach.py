#!/usr/bin/env python3
"""
Test script to understand how the old crypto configuration was supposed to work.
Let's try to reconstruct a working private key using the φ(n) value.
"""

import os
import sys
import json
import shamirs
import base64
import math

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app import create_app, db
from app.models.crypto_config import CryptoConfig
from phe import paillier

def integer_sqrt(n):
    """Compute integer square root using Newton's method for very large numbers."""
    if n == 0:
        return 0
    
    # Initial guess
    x = n
    y = (x + 1) // 2
    
    while y < x:
        x = y
        y = (x + n // x) // 2
    
    return x

def test_alternative_reconstruction():
    """Test alternative approaches for reconstruction."""
    
    print("🔍 TESTING ALTERNATIVE RECONSTRUCTION APPROACHES")
    print("=" * 70)
    
    # The reconstructed φ(n) from our analysis
    phi_n = 21763662406562812331680510411825609924097673175797328368862463035474988013175177939208621851650178212479027179158688146403176248987725738102422508280050466583460045879505051655577567626974426979670575412993635961911078840022713651684205076170463096820583382787386511379528329914965771178615353770896626921486041106468174816101517943692187914563800
    
    app = create_app()
    with app.app_context():
        crypto_config = CryptoConfig.query.filter_by(election_id=41).first()
        if not crypto_config:
            print("❌ No crypto config found for election 41")
            return
            
        public_key_data = json.loads(crypto_config.public_key)
        public_n = int(public_key_data.get('n'))
        
        print(f"Public key n: {public_n}")
        print(f"Reconstructed φ(n): {phi_n}")
        print(f"n bit length: {public_n.bit_length()}")
        print(f"φ(n) bit length: {phi_n.bit_length()}")
        
        # Approach 1: Try Pollard's rho factorization using φ(n) as a hint
        print(f"\n🧮 APPROACH 1: MATHEMATICAL FACTORIZATION")
        print(f"Since φ(n) = (p-1)(q-1) and n = p*q")
        print(f"We have: φ(n) = pq - p - q + 1 = n - p - q + 1")
        print(f"Therefore: p + q = n - φ(n) + 1")
        
        sum_pq = public_n - phi_n + 1
        print(f"p + q = {sum_pq}")
        
        # We need to solve: p + q = sum_pq and p * q = n
        # This gives us the quadratic: t² - (sum_pq)t + n = 0
        # Using quadratic formula: t = (sum_pq ± √(sum_pq² - 4n)) / 2
        
        discriminant = sum_pq * sum_pq - 4 * public_n
        print(f"Discriminant = (p+q)² - 4n = {discriminant}")
        if discriminant > 0:
            # Use integer square root for large numbers
            def integer_sqrt(n):
                """Compute integer square root using Newton's method."""
                if n < 0:
                    return None
                if n == 0:
                    return 0
                
                # Initial guess
                x = n
                while True:
                    # Newton's method: x_new = (x + n/x) // 2
                    x_new = (x + n // x) // 2
                    if x_new >= x:
                        return x
                    x = x_new
            
            sqrt_discriminant = integer_sqrt(discriminant)
            print(f"Integer square root approximation: {sqrt_discriminant}")
            
            # Check if it's a perfect square
            if sqrt_discriminant * sqrt_discriminant == discriminant:
                print(f"✅ Found exact square root: {sqrt_discriminant}")
                
                p_candidate = (sum_pq + sqrt_discriminant) // 2
                q_candidate = (sum_pq - sqrt_discriminant) // 2
                
                print(f"p candidate: {p_candidate}")
                print(f"q candidate: {q_candidate}")
                
                if p_candidate * q_candidate == public_n:
                    print(f"✅ SUCCESS! Found prime factors!")
                    print(f"p = {p_candidate}")
                    print(f"q = {q_candidate}")
                    
                    # Test Paillier decryption with these primes
                    return test_paillier_with_primes(public_n, p_candidate, q_candidate)
                else:
                    print(f"❌ p * q = {p_candidate * q_candidate} ≠ n = {public_n}")
            else:
                # Check a small range around the approximation
                print(f"Checking range around {sqrt_discriminant}")
                found = False
                for delta in range(-10, 11):
                    candidate_sqrt = sqrt_discriminant + delta
                    if candidate_sqrt > 0 and candidate_sqrt * candidate_sqrt == discriminant:
                        print(f"✅ Found exact square root: {candidate_sqrt}")
                        
                        p_candidate = (sum_pq + candidate_sqrt) // 2
                        q_candidate = (sum_pq - candidate_sqrt) // 2
                        
                        print(f"p candidate: {p_candidate}")
                        print(f"q candidate: {q_candidate}")
                        
                        if p_candidate * q_candidate == public_n:
                            print(f"✅ SUCCESS! Found prime factors!")
                            print(f"p = {p_candidate}")
                            print(f"q = {q_candidate}")
                            
                            # Test Paillier decryption with these primes
                            return test_paillier_with_primes(public_n, p_candidate, q_candidate)
                        else:
                            print(f"❌ p * q = {p_candidate * q_candidate} ≠ n = {public_n}")
                        found = True
                        break
                
                if not found:
                    print(f"❌ Could not find integer square root of discriminant")
                    print(f"Discriminant is not a perfect square")
        else:
            print(f"❌ Negative discriminant - no real solutions")
            
        # Approach 2: Try using φ(n) as lambda directly with custom Paillier implementation
        print(f"\n🔧 APPROACH 2: CUSTOM PAILLIER WITH φ(n)")
        
        try:
            # Create a custom private key that uses φ(n) as the lambda value
            # This might work if the original implementation used φ(n) directly
            
            pubkey = paillier.PaillierPublicKey(n=public_n)
            
            # Test message
            test_message = 42
            encrypted = pubkey.encrypt(test_message)
            print(f"Test message: {test_message}")
            print(f"Encrypted: {encrypted.ciphertext()}")
            
            # Try decryption using φ(n) as the secret exponent
            # In Paillier: m = L(c^λ mod n²) * μ mod n
            
            n_squared = public_n * public_n
            lambda_val = phi_n
            
            # Compute c^λ mod n²
            c_lambda = pow(encrypted.ciphertext(), lambda_val, n_squared)
            
            # L function: L(x) = (x-1)/n
            if (c_lambda - 1) % public_n == 0:
                l_value = (c_lambda - 1) // public_n
                
                # For μ, we need to compute (L(g^λ mod n²))^(-1) mod n
                # where g is typically n+1 in Paillier
                g = public_n + 1
                g_lambda = pow(g, lambda_val, n_squared)
                
                if (g_lambda - 1) % public_n == 0:
                    l_g_value = (g_lambda - 1) // public_n
                      # Try to compute modular inverse
                    def mod_inverse(a, m):
                        """Compute modular inverse using extended Euclidean algorithm."""
                        def extended_gcd(a, b):
                            if a == 0:
                                return b, 0, 1
                            gcd, x1, y1 = extended_gcd(b % a, a)
                            x = y1 - (b // a) * x1
                            y = x1
                            return gcd, x, y
                        
                        gcd, x, y = extended_gcd(a, m)
                        if gcd != 1:
                            return None
                        return (x % m + m) % m
                    
                    gcd_val = math.gcd(l_g_value, public_n)
                    if gcd_val == 1:
                        mu = mod_inverse(l_g_value, public_n)
                        if mu is not None:
                            decrypted = (l_value * mu) % public_n
                            
                            print(f"Decrypted message: {decrypted}")
                            if decrypted == test_message:
                                print(f"✅ SUCCESS! Custom Paillier with φ(n) works!")
                                return True
                            else:
                                print(f"❌ Wrong decryption result: {decrypted} ≠ {test_message}")
                        else:
                            print(f"❌ Could not compute modular inverse")
                    else:
                        print(f"❌ Cannot compute modular inverse, gcd = {gcd_val}")
                else:
                    print(f"❌ L(g^λ mod n²) computation failed")
            else:
                print(f"❌ L(c^λ mod n²) computation failed")
                
        except Exception as e:
            print(f"❌ Custom Paillier approach failed: {e}")
            
        # Approach 3: Check if the shared secret was actually something else
        print(f"\n🔍 APPROACH 3: INVESTIGATE WHAT WAS ACTUALLY SHARED")
        
        # Let's look at the bit patterns and see if there are clues
        print(f"φ(n) in binary (last 64 bits): {bin(phi_n)[-64:]}")
        print(f"n in binary (last 64 bits): {bin(public_n)[-64:]}")
        
        # Check if φ(n) has any obvious factors
        print(f"\n🧪 FACTOR ANALYSIS OF φ(n)")
        print(f"φ(n) is even: {phi_n % 2 == 0}")
        if phi_n % 2 == 0:
            phi_n_half = phi_n // 2
            print(f"φ(n)/2 = {phi_n_half}")
        
        # Check if φ(n) is divisible by small primes
        small_primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31]
        for p in small_primes:
            if phi_n % p == 0:
                print(f"φ(n) is divisible by {p}: φ(n)/{p} = {phi_n // p}")
                
        return False

def test_paillier_with_primes(n, p, q):
    """Test Paillier decryption with the discovered primes."""
    
    print(f"\n🧪 TESTING PAILLIER WITH DISCOVERED PRIMES")
    print(f"n = {n}")
    print(f"p = {p}")
    print(f"q = {q}")
    
    try:
        # Create Paillier keys
        pubkey = paillier.PaillierPublicKey(n=n)
        privkey = paillier.PaillierPrivateKey(pubkey, p, q)
        
        # Test encryption/decryption
        test_message = 42
        encrypted = pubkey.encrypt(test_message)
        decrypted = privkey.decrypt(encrypted)
        
        print(f"Test message: {test_message}")
        print(f"Decrypted: {decrypted}")
        
        if decrypted == test_message:
            print(f"✅ SUCCESS! Paillier works with discovered primes!")
            return True
        else:
            print(f"❌ Decryption failed: {decrypted} ≠ {test_message}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing Paillier with primes: {e}")
        return False

if __name__ == "__main__":
    test_alternative_reconstruction()
