#!/usr/bin/env python3
"""
Test script to verify consistency between what prime is shared vs stored in the key generation process.
This will help us identify if there's a mismatch between the prime used for Shamir sharing and the prime stored in metadata.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from phe import paillier
import shamirs
import json

def test_key_generation_consistency():
    """Test the consistency between sharing and storage in our key generation logic"""
    print("Testing key generation consistency...")
    
    # Generate a Paillier keypair (same as in our code)
    public_key, private_key = paillier.generate_paillier_keypair(n_length=2048)
    priv_key_p = int(private_key.p)
    priv_key_q = int(private_key.q)
    
    print(f"Generated Paillier keypair:")
    print(f"  n = {public_key.n}")
    print(f"  p = {priv_key_p}")
    print(f"  q = {priv_key_q}")
    print(f"  p < q: {priv_key_p < priv_key_q}")
    print(f"  p * q = n: {priv_key_p * priv_key_q == public_key.n}")
    
    # Generate a prime for Shamir secret sharing (same logic as our code)
    secret_bits = priv_key_p.bit_length()
    min_prime_bits = max(secret_bits + 128, 512)
    prime_candidate = 2**min_prime_bits
    
    # Simplified next_prime function using Miller-Rabin test
    def is_prime(n, k=5):
        """Miller-Rabin primality test"""
        if n < 2:
            return False
        if n == 2 or n == 3:
            return True
        if n % 2 == 0:
            return False
        
        # Write n-1 as d * 2^r
        r = 0
        d = n - 1
        while d % 2 == 0:
            r += 1
            d //= 2
        
        # Test k times
        import random
        for _ in range(k):
            a = random.randrange(2, n - 1)
            x = pow(a, d, n)
            if x == 1 or x == n - 1:
                continue
            for _ in range(r - 1):
                x = pow(x, 2, n)
                if x == n - 1:
                    break
            else:
                return False
        return True
    
    def next_prime(n):
        candidate = n + 1
        if candidate % 2 == 0:
            candidate += 1
        while not is_prime(candidate):
            candidate += 2
        return candidate
    
    shamir_prime = next_prime(prime_candidate)
    print(f"\nShamir prime modulus: {shamir_prime}")
    print(f"Shamir prime bits: {shamir_prime.bit_length()}")
    
    # Simulate the key generation process
    n_personnel = 3
    threshold = 2
    
    # Generate shares using priv_key_p (this is what our code does)
    shares_raw_p = shamirs.shares(priv_key_p, quantity=n_personnel, modulus=shamir_prime, threshold=threshold)
    
    # Serialize shares (same as our code)
    shares = [f"{share.index}:{hex(share.value)[2:]}" for share in shares_raw_p]
    
    # Create security_data (same as our code)
    security_data = {
        "n": str(public_key.n),
        "p": str(priv_key_p),  # Store the actual Paillier prime factor p
        "p_times_q": str(priv_key_p * priv_key_q),
        "prime_modulus": str(shamir_prime),  # Store the Shamir modulus prime
        "key_bits": public_key.n.bit_length()                
    }
    
    # Create meta_data (same as our code)
    meta_data = {
        'crypto_type': 'paillier',
        'n_personnel': n_personnel,
        'threshold': threshold,
        'p': str(priv_key_p),  # Store the actual Paillier prime factor p  
        'prime': str(shamir_prime),  # Store the Shamir modulus prime
        'prime_modulus': str(shamir_prime),
        'security_data': security_data,
        'key_bits': public_key.n.bit_length()
    }
    
    print(f"\nStored in security_data['p']: {security_data['p']}")
    print(f"Stored in meta_data['p']: {meta_data['p']}")
    print(f"Secret shared: {priv_key_p}")
    print(f"Are they the same? {security_data['p'] == str(priv_key_p) == meta_data['p']}")
    
    # Test reconstruction
    print(f"\nTesting reconstruction...")
    
    # Parse shares back to shamirs format (same as reconstruction code)
    parsed_shares = []
    for share_str in shares:
        if ':' in share_str:
            x_str, y_hex = share_str.split(':', 1)
            x = int(x_str)
            y = int(y_hex, 16)
            share_obj = shamirs.share(x, y, shamir_prime)
            parsed_shares.append(share_obj)
    
    # Use first 2 shares (threshold = 2)
    reconstructed_secret = shamirs.interpolate(parsed_shares[:threshold])
    
    print(f"Reconstructed secret: {reconstructed_secret}")
    print(f"Original priv_key_p: {priv_key_p}")
    print(f"Reconstruction matches original: {reconstructed_secret == priv_key_p}")
    
    # Check if reconstructed secret divides n
    print(f"Reconstructed secret divides n: {public_key.n % reconstructed_secret == 0}")
    
    # Calculate the other factor
    other_factor = public_key.n // reconstructed_secret
    print(f"Other factor: {other_factor}")
    print(f"Other factor equals q: {other_factor == priv_key_q}")
    
    # Summary
    print(f"\n=== SUMMARY ===")
    print(f"Prime shared via Shamir: {priv_key_p}")
    print(f"Prime stored in metadata: {security_data['p']}")
    print(f"Prime stored in meta_data: {meta_data['p']}")
    print(f"All consistent: {str(priv_key_p) == security_data['p'] == meta_data['p']}")
    print(f"Reconstruction works: {reconstructed_secret == priv_key_p}")
    
    return {
        'shared_prime': priv_key_p,
        'stored_prime_security': int(security_data['p']),
        'stored_prime_metadata': int(meta_data['p']),
        'reconstructed_prime': reconstructed_secret,
        'consistent': str(priv_key_p) == security_data['p'] == meta_data['p'],
        'reconstruction_works': reconstructed_secret == priv_key_p
    }

if __name__ == "__main__":
    result = test_key_generation_consistency()
    
    if result['consistent'] and result['reconstruction_works']:
        print(f"\n✅ TEST PASSED: Key generation logic is consistent")
    else:
        print(f"\n❌ TEST FAILED: Key generation logic has inconsistencies")
        print(f"  Consistent storage: {result['consistent']}")
        print(f"  Reconstruction works: {result['reconstruction_works']}")
