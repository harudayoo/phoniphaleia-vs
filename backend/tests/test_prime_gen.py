"""
Test prime number generation and Paillier key generation
"""
import sys
import os
import unittest
import time
from phe import paillier

# Add parent directory to path to import app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

try:
    from sympy import nextprime as next_prime
except ImportError:
    # Fallback implementation for next_prime
    def next_prime(n):
        """Simple next prime implementation"""
        n += 1
        while True:
            if all(n % i != 0 for i in range(2, int(n**0.5) + 1)):
                return n
            n += 1

class TestPrimeGeneration(unittest.TestCase):
    """Test prime number generation and key generation"""
    
    def test_next_prime_performance(self):
        """Test the performance of next_prime"""
        print("\n=== Testing next_prime performance ===")
        
        # Small prime
        start_time = time.time()
        small_prime = next_prime(1000)
        small_time = time.time() - start_time
        print(f"Next prime after 1000: {small_prime} (took {small_time:.6f} seconds)")
        
        # Medium prime
        start_time = time.time()
        medium_prime = next_prime(10**6)
        medium_time = time.time() - start_time
        print(f"Next prime after 10^6: {medium_prime} (took {medium_time:.6f} seconds)")
        
        # Large prime using precomputed values
        start_time = time.time()
        large_prime = next_prime(2**400)
        large_time = time.time() - start_time
        print(f"Next prime after 2^400: {large_prime} (took {large_time:.6f} seconds)")
        print(f"Large prime bit length: {large_prime.bit_length()}")
        
        # Very large prime should use precomputed values
        start_time = time.time()
        very_large_prime = next_prime(2**1000)
        very_large_time = time.time() - start_time
        print(f"Next prime after 2^1000: (bit length: {very_large_prime.bit_length()}) (took {very_large_time:.6f} seconds)")
        
        # Ensure all operations completed within a reasonable time
        self.assertLess(small_time, 1.0, "Small prime generation took too long")
        self.assertLess(medium_time, 2.0, "Medium prime generation took too long")
        self.assertLess(large_time, 1.0, "Large prime generation took too long")
        self.assertLess(very_large_time, 1.0, "Very large prime generation took too long")
    
    def test_paillier_key_generation(self):
        """Test Paillier key generation"""
        print("\n=== Testing Paillier key generation ===")
        
        # Time the key generation
        start_time = time.time()
        public_key, private_key = paillier.generate_paillier_keypair(n_length=1024)
        generation_time = time.time() - start_time
        
        print(f"Generated Paillier keypair with {public_key.n.bit_length()} bits in {generation_time:.2f} seconds")
        print(f"p: {private_key.p}")
        print(f"q: {private_key.q}")
        
        # Test a simple encryption/decryption
        test_value = 42
        encrypted = public_key.encrypt(test_value)
        decrypted = private_key.decrypt(encrypted)
        
        print(f"Encrypted {test_value} and decrypted back to {decrypted}")
        self.assertEqual(test_value, decrypted)
        
if __name__ == '__main__':
    unittest.main()
