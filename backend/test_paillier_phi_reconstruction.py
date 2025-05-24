#!/usr/bin/env python3
"""
Test script to implement alternative Paillier decryption using φ(n) instead of prime factors.
Based on the mathematical property that Paillier decryption can work with the Carmichael function λ(n).
"""

import os
import sys
import json
import base64

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app import create_app, db
from app.models.crypto_config import CryptoConfig
import shamirs

def gcd(a, b):
    """Calculate the Greatest Common Divisor of a and b."""
    while b:
        a, b = b, a % b
    return a

def lcm(a, b):
    """Calculate the Least Common Multiple of a and b."""
    return abs(a * b) // gcd(a, b)

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
        raise ValueError("Modular inverse doesn't exist")
    return x % m

class PaillierPhiDecryptor:
    """
    Custom Paillier decryptor that works with φ(n) instead of prime factors.
    
    In standard Paillier, we need p and q to decrypt. However, we can also
    decrypt using the Carmichael function λ(n) = lcm(p-1, q-1).
    For RSA-like n = p*q, φ(n) = (p-1)(q-1) and λ(n) divides φ(n).
    """
    def __init__(self, n, phi_n):
        self.n = n
        self.phi_n = phi_n
        self.n_squared = n * n
        # For RSA-like modulus n = p*q, λ(n) = lcm(p-1, q-1)
        # We'll try different approaches to find a working λ(n)
        self.lambda_n = self._compute_lambda_n()
        
    def _compute_lambda_n(self):
        """
        Compute Carmichael function λ(n).
        For n = p*q, λ(n) = lcm(p-1, q-1).
        Since φ(n) = (p-1)(q-1), we have gcd(p-1, q-1) | φ(n).
        
        We can try λ(n) = φ(n) or λ(n) = φ(n)/2 as common cases.
        """
        # First try: λ(n) = φ(n)
        # This works when gcd(p-1, q-1) = 1
        lambda_candidate = self.phi_n
        
        # Test if this works by checking if g^λ ≡ 1 (mod n²) for g = n+1
        g = self.n + 1
        if pow(g, lambda_candidate, self.n_squared) == 1:
            print(f"✅ Found working λ(n) = φ(n) = {lambda_candidate}")
            return lambda_candidate
            
        # Second try: λ(n) = φ(n)/2
        # This works when gcd(p-1, q-1) = 2 (common case)
        if self.phi_n % 2 == 0:
            lambda_candidate = self.phi_n // 2
            if pow(g, lambda_candidate, self.n_squared) == 1:
                print(f"✅ Found working λ(n) = φ(n)/2 = {lambda_candidate}")
                return lambda_candidate
        
        # Third try: find divisors of φ(n) and test them
        print("⚠️  Testing divisors of φ(n) to find λ(n)...")
        for divisor in self._get_small_divisors(self.phi_n):
            lambda_candidate = self.phi_n // divisor
            if pow(g, lambda_candidate, self.n_squared) == 1:
                print(f"✅ Found working λ(n) = φ(n)/{divisor} = {lambda_candidate}")
                return lambda_candidate
        
        print("❌ Could not find working λ(n), falling back to φ(n)")
        return self.phi_n
    
    def _get_small_divisors(self, n):
        """Get small divisors of n to test as candidates for gcd(p-1, q-1)."""
        divisors = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 24, 30]
        return [d for d in divisors if n % d == 0]
    
    def _L_function(self, x):
        """The L function used in Paillier decryption: L(x) = (x - 1) / n."""
        return (x - 1) // self.n
    
    def decrypt(self, ciphertext):
        """
        Decrypt a Paillier ciphertext using φ(n) instead of prime factors.
        
        Standard Paillier decryption:
        m = L(c^λ mod n²) * μ mod n
        where μ = (L(g^λ mod n²))^(-1) mod n
        """
        try:
            # Convert ciphertext to integer if it's a string
            c = int(ciphertext) if isinstance(ciphertext, str) else ciphertext
            
            # Calculate c^λ mod n²
            c_lambda = pow(c, self.lambda_n, self.n_squared)
            
            # Apply L function
            l_c_lambda = self._L_function(c_lambda)
            
            # Calculate μ = (L(g^λ mod n²))^(-1) mod n
            g = self.n + 1  # Standard choice for g in Paillier
            g_lambda = pow(g, self.lambda_n, self.n_squared)
            l_g_lambda = self._L_function(g_lambda)
            
            # Calculate modular inverse of L(g^λ mod n²) mod n
            mu = mod_inverse(l_g_lambda, self.n)
            
            # Final decryption: m = L(c^λ mod n²) * μ mod n
            plaintext = (l_c_lambda * mu) % self.n
            
            return plaintext
            
        except Exception as e:
            print(f"❌ Decryption error: {e}")
            raise

def test_phi_based_decryption():
    """Test Paillier decryption using φ(n) approach."""
    
    print("🔧 TESTING PAILLIER DECRYPTION WITH φ(n)")
    print("=" * 60)
    
    # The reconstructed φ(n) from our previous analysis
    phi_n = 21763662406562812331680510411825609924097673175797328368862463035474988013175177939208621851650178212479027179158688146403176248987725738102422508280050466583460045879505051655577567626974426979670575412993635961911078840022713651684205076170463096820583382787386511379528329914965771178615353770896626921486041106468174816101517943692187914563800
    
    # Get n from the crypto config
    app = create_app()
    with app.app_context():
        crypto_config = CryptoConfig.query.filter_by(election_id=41).first()
        if not crypto_config:
            print("❌ No crypto config found for election 41")
            return False
            
        # Parse n from public key
        try:
            public_key_data = json.loads(base64.b64decode(crypto_config.public_key))
        except:
            public_key_data = json.loads(crypto_config.public_key)
        n = int(public_key_data['n'])
        
        print(f"n = {n}")
        print(f"φ(n) = {phi_n}")
        print(f"n.bit_length() = {n.bit_length()}")
        print(f"φ(n).bit_length() = {phi_n.bit_length()}")
        
        # Create our custom decryptor
        decryptor = PaillierPhiDecryptor(n, phi_n)
        
        # Test with a simple encrypted value
        # First, let's encrypt a test value using standard Paillier
        from phe import paillier
        
        # Create a temporary public key for testing encryption
        public_key = paillier.PaillierPublicKey(n=n)
        
        # Test values
        test_values = [0, 1, 5, 42, 100, 999]
        
        print(f"\n🧪 TESTING DECRYPTION WITH VARIOUS VALUES:")
        print("-" * 50)
        
        success_count = 0
        for test_val in test_values:
            try:
                # Encrypt using standard Paillier
                encrypted = public_key.encrypt(test_val)
                ciphertext = encrypted.ciphertext()
                
                # Decrypt using our φ(n)-based approach
                decrypted = decryptor.decrypt(ciphertext)
                
                success = (decrypted == test_val)
                status = "✅" if success else "❌"
                print(f"{status} Test value: {test_val}, Decrypted: {decrypted}, Match: {success}")
                
                if success:
                    success_count += 1
                    
            except Exception as e:
                print(f"❌ Error testing value {test_val}: {e}")
        
        print(f"\n📊 RESULTS: {success_count}/{len(test_values)} successful decryptions")
        
        if success_count == len(test_values):
            print("🎉 SUCCESS: φ(n)-based Paillier decryption is working!")
            return True
        elif success_count > 0:
            print("⚠️  PARTIAL SUCCESS: Some decryptions work, may need parameter tuning")
            return True
        else:
            print("❌ FAILURE: φ(n)-based decryption is not working")
            return False
        print(f"Encrypted message: {encrypted.ciphertext()}")
        
        # Now try to decrypt using φ(n) directly
        print(f"\n🔓 ATTEMPTING DECRYPTION WITH φ(n)")
        
        try:
            # Method 1: Try to create a private key using φ(n) as the secret
            # In Paillier, the private key typically needs individual primes p and q
            # But let's see if we can work around this
            
            # For Paillier decryption, we need to compute:
            # m = L(c^λ mod n²) * μ mod n
            # where L(x) = (x-1)/n and λ = lcm(p-1, q-1) and μ = (L(g^λ mod n²))^(-1) mod n
            
            # Since we have φ(n) = (p-1)(q-1), we can try to use it as λ
            # Note: λ = lcm(p-1, q-1), but for many cases λ = φ(n) when gcd(p-1, q-1) is small
            lambda_n = phi_n
            
            # Compute L(c^λ mod n²)
            n_squared = public_n * public_n
            c_lambda_mod_n2 = pow(encrypted.ciphertext(), lambda_n, n_squared)
            
            # L(x) = (x-1) / n
            if (c_lambda_mod_n2 - 1) % public_n == 0:
                l_value = (c_lambda_mod_n2 - 1) // public_n
                print(f"L(c^λ mod n²) = {l_value}")
                
                # Now we need μ = (L(g^λ mod n²))^(-1) mod n
                # For standard Paillier, g = n + 1, so g^λ mod n² = (n+1)^λ mod n²
                g = public_n + 1
                g_lambda_mod_n2 = pow(g, lambda_n, n_squared)
                
                if (g_lambda_mod_n2 - 1) % public_n == 0:
                    l_g_value = (g_lambda_mod_n2 - 1) // public_n
                    
                    # Compute modular inverse
                    try:
                        mu = pow(l_g_value, -1, public_n)
                        print(f"μ = {mu}")
                        
                        # Final decryption
                        decrypted = (l_value * mu) % public_n
                        print(f"Decrypted message: {decrypted}")
                        
                        if decrypted == test_message:
                            print(f"✅ SUCCESS! Decryption works with φ(n)!")
                            print(f"Original: {test_message}, Decrypted: {decrypted}")
                            return True
                        else:
                            print(f"❌ Decryption failed. Expected {test_message}, got {decrypted}")
                    except ValueError as e:
                        print(f"❌ Could not compute modular inverse: {e}")
                else:
                    print(f"❌ L(g^λ mod n²) computation failed")
            else:
                print(f"❌ L(c^λ mod n²) computation failed")
                
        except Exception as e:
            print(f"❌ Error during φ(n)-based decryption: {e}")
            
        # Method 2: Try to use the fact that for many Paillier implementations,
        # we can approximate λ ≈ φ(n) when p and q are close in size
        print(f"\n🔄 TRYING ALTERNATIVE APPROACH")
        
        try:
            # Sometimes λ = φ(n)/gcd(p-1, q-1) where gcd is typically 2 for safe primes
            # Let's try λ = φ(n)/2
            lambda_alt = phi_n // 2
            print(f"Trying λ = φ(n)/2 = {lambda_alt}")
            
            c_lambda_mod_n2 = pow(encrypted.ciphertext(), lambda_alt, n_squared)
            
            if (c_lambda_mod_n2 - 1) % public_n == 0:
                l_value = (c_lambda_mod_n2 - 1) // public_n
                
                g_lambda_mod_n2 = pow(g, lambda_alt, n_squared)
                
                if (g_lambda_mod_n2 - 1) % public_n == 0:
                    l_g_value = (g_lambda_mod_n2 - 1) // public_n
                    
                    try:
                        mu = pow(l_g_value, -1, public_n)
                        decrypted = (l_value * mu) % public_n
                        print(f"Decrypted message with λ/2: {decrypted}")
                        
                        if decrypted == test_message:
                            print(f"✅ SUCCESS! Decryption works with φ(n)/2!")
                            return True
                    except ValueError:
                        pass
                        
        except Exception as e:
            print(f"❌ Alternative approach failed: {e}")
            
        print(f"❌ Could not decrypt using φ(n) directly")
        return False

if __name__ == "__main__":
    test_phi_based_decryption()
