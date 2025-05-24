#!/usr/bin/env python3
"""
Test script to attempt factorization using φ(n) to recover p and q.
"""

import os
import sys
import json
import shamirs
import base64

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app import create_app, db
from app.models.crypto_config import CryptoConfig
from phe import paillier

def integer_sqrt(n):
    """Compute integer square root using Newton's method for very large numbers."""
    if n == 0:
        return 0
    
    # Initial guess - start with the number itself
    x = n
    y = (x + 1) // 2
    
    # Newton's method iteration
    while y < x:
        x = y
        y = (x + n // x) // 2
    
    return x

def mod_inverse(a, m):
    """Calculate modular inverse using extended Euclidean algorithm."""
    def extended_gcd(a, b):
        if a == 0:
            return b, 0, 1
        gcd, x1, y1 = extended_gcd(b % a, a)
        x = y1 - (b // a) * x1
        y = x1
        return gcd, x, y
    
    gcd, x, _ = extended_gcd(a % m, m)
    if gcd != 1:
        raise ValueError("Modular inverse does not exist")
    return (x % m + m) % m

def attempt_factorization_with_phi():
    """Attempt to factor n using knowledge of φ(n)."""
    
    print("🔍 ATTEMPTING FACTORIZATION USING φ(n)")
    print("=" * 60)
    
    # The reconstructed φ(n) from our analysis
    phi_n = 21763662406562812331680510411825609924097673175797328368862463035474988013175177939208621851650178212479027179158688146403176248987725738102422508280050466583460045879505051655577567626974426979670575412993635961911078840022713651684205076170463096820583382787386511379528329914965771178615353770896626921486041106468174816101517943692187914563800
    
    # Get n from the crypto config
    app = create_app()
    with app.app_context():
        crypto_config = CryptoConfig.query.filter_by(election_id=41).first()
        if not crypto_config:
            print("❌ No crypto config found for election 41")
            return None, None
          # Parse n from public key (try both base64 and direct JSON)
        try:
            public_key_data = json.loads(base64.b64decode(crypto_config.public_key))
        except:
            # If base64 decode fails, try direct JSON parsing
            public_key_data = json.loads(crypto_config.public_key)
        n = int(public_key_data['n'])
        
        print(f"n = {n}")
        print(f"φ(n) = {phi_n}")
        print(f"n - φ(n) = {n - phi_n}")
        
        # For n = p*q where p and q are primes:
        # φ(n) = (p-1)(q-1) = pq - p - q + 1 = n - (p + q) + 1
        # So: p + q = n - φ(n) + 1
        p_plus_q = n - phi_n + 1
        print(f"p + q = {p_plus_q}")
        
        # We have:
        # p + q = p_plus_q
        # p * q = n
        # This gives us a quadratic equation:
        # x² - (p + q)x + n = 0
        # Using quadratic formula: x = ((p + q) ± √((p + q)² - 4n)) / 2
        
        discriminant = p_plus_q * p_plus_q - 4 * n
        print(f"Discriminant = {discriminant}")
        
        if discriminant < 0:
            print("❌ Negative discriminant - no real solutions")
            return None, None
        
        # Calculate square root of discriminant
        sqrt_discriminant = integer_sqrt(discriminant)
        
        # Verify that we have a perfect square
        if sqrt_discriminant * sqrt_discriminant != discriminant:
            print(f"❌ Discriminant is not a perfect square")
            print(f"√discriminant ≈ {sqrt_discriminant}")
            print(f"(√discriminant)² = {sqrt_discriminant * sqrt_discriminant}")
            print(f"Difference = {discriminant - sqrt_discriminant * sqrt_discriminant}")
            return None, None
        
        print(f"√discriminant = {sqrt_discriminant}")
        
        # Calculate p and q
        p = (p_plus_q + sqrt_discriminant) // 2
        q = (p_plus_q - sqrt_discriminant) // 2
        
        print(f"Computed p = {p}")
        print(f"Computed q = {q}")
        
        # Verify our solution
        print("\n🔍 VERIFICATION:")
        print(f"p * q = {p * q}")
        print(f"n = {n}")
        print(f"p * q == n? {p * q == n}")
        
        computed_phi = (p - 1) * (q - 1)
        print(f"(p-1)(q-1) = {computed_phi}")
        print(f"φ(n) = {phi_n}")
        print(f"(p-1)(q-1) == φ(n)? {computed_phi == phi_n}")
        
        if p * q == n and computed_phi == phi_n:
            print("✅ Factorization successful!")
            return p, q
        else:
            print("❌ Factorization failed")
            return None, None

def test_paillier_with_factored_primes(p, q):
    """Test Paillier encryption/decryption with the factored primes."""
    
    if p is None or q is None:
        print("❌ Cannot test - no valid primes")
        return
    
    print("\n🔍 TESTING PAILLIER WITH FACTORED PRIMES")
    print("=" * 60)
    
    try:
        # Create Paillier private key from p and q
        n = p * q
        private_key = paillier.PaillierPrivateKey(p, q)
        public_key = private_key.public_key
        
        print(f"Created Paillier key pair with n = {n}")
        
        # Test encryption/decryption
        test_message = 42
        encrypted = public_key.encrypt(test_message)
        decrypted = private_key.decrypt(encrypted)
        
        print(f"Test message: {test_message}")
        print(f"Encrypted: {encrypted.ciphertext()}")
        print(f"Decrypted: {decrypted}")
        print(f"Encryption/decryption successful: {test_message == decrypted}")
        
        return private_key
        
    except Exception as e:
        print(f"❌ Error creating Paillier key: {e}")
        return None

def main():
    """Main test function."""
    
    print("🔧 ATTEMPTING TO RECOVER PAILLIER PRIVATE KEY")
    print("=" * 70)
    
    # Try to factor n using φ(n)
    p, q = attempt_factorization_with_phi()
    
    if p and q:
        # Test the reconstructed private key
        private_key = test_paillier_with_factored_primes(p, q)
        
        if private_key:
            print("\n✅ SUCCESS: Private key reconstructed and working!")
        else:
            print("\n❌ FAILURE: Could not create working private key")
    else:
        print("\n❌ FAILURE: Could not factor n using φ(n)")

if __name__ == "__main__":
    main()
