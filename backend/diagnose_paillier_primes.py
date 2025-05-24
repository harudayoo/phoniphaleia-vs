#!/usr/bin/env python3
"""
Diagnostic script to understand which prime the python-paillier library assigns to p vs q
"""

import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from phe import paillier
import shamirs

def main():
    print("=== Python-Paillier Library Prime Assignment Investigation ===")
    
    # Generate 5 different keypairs to see the pattern
    for i in range(5):
        print(f"\n--- Keypair {i+1} ---")
        
        # Generate a Paillier keypair
        public_key, private_key = paillier.generate_paillier_keypair(n_length=1024)
        
        p = int(private_key.p)
        q = int(private_key.q)
        n = int(public_key.n)
        
        print(f"n = {n}")
        print(f"p = {p}")
        print(f"q = {q}")
        print(f"p * q = {p * q}")
        print(f"n == p * q: {n == p * q}")
        print(f"p < q: {p < q}")
        print(f"p bit length: {p.bit_length()}")
        print(f"q bit length: {q.bit_length()}")
        
        # Verify both are prime factors
        print(f"n % p == 0: {n % p == 0}")
        print(f"n % q == 0: {n % q == 0}")
        print(f"n // p == q: {n // p == q}")
        print(f"n // q == p: {n // q == p}")
        
        # Test Shamir sharing of p vs q
        print(f"\n--- Testing Shamir sharing for keypair {i+1} ---")
        
        # Calculate a Shamir prime
        secret_bits = max(p.bit_length(), q.bit_length())
        min_prime_bits = max(secret_bits + 128, 512)
        prime_candidate = 2**min_prime_bits
        shamir_prime = find_next_prime(prime_candidate)
        
        print(f"Shamir prime: {shamir_prime}")
        print(f"Shamir prime bit length: {shamir_prime.bit_length()}")
        
        # Generate shares for p and q
        try:
            shares_p = shamirs.shares(p, quantity=3, modulus=shamir_prime, threshold=2)
            shares_q = shamirs.shares(q, quantity=3, modulus=shamir_prime, threshold=2)
            
            # Reconstruct
            reconstructed_p = shamirs.interpolate(shares_p[:2])
            reconstructed_q = shamirs.interpolate(shares_q[:2])
            
            print(f"Original p: {p}")
            print(f"Reconstructed from p shares: {reconstructed_p}")
            print(f"p reconstruction matches: {p == reconstructed_p}")
            
            print(f"Original q: {q}")
            print(f"Reconstructed from q shares: {reconstructed_q}")
            print(f"q reconstruction matches: {q == reconstructed_q}")
            
            # Cross-check: what happens if we store p but share q?
            print(f"\n--- Cross-check: store p, share q ---")
            print(f"If we store p={p} but reconstruct q={reconstructed_q}:")
            print(f"Stored p divides n: {n % p == 0}")
            print(f"Reconstructed q divides n: {n % reconstructed_q == 0}")
            print(f"They are different: {p != reconstructed_q}")
            
        except Exception as e:
            print(f"Error in Shamir sharing: {e}")
            import traceback
            traceback.print_exc()

def find_next_prime(n):
    """Simple prime finding function"""
    try:
        from sympy import nextprime
        return nextprime(n)
    except ImportError:
        # Fallback to a large known prime
        return 13407807929942597099574024998205846127479365820592393377723561443721764030073546976801874298166903427690031858186486050853753882811946569946433649006083527

if __name__ == "__main__":
    main()
