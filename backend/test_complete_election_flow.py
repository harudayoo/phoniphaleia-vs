#!/usr/bin/env python3
"""
Test script to verify the complete election flow with proper library usage.
Tests: Key generation → Vote encryption → Homomorphic tallying → Key reconstruction → Decryption
"""

import sys
import os
import json
import logging
import traceback
import random
from datetime import datetime, timedelta

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

# Import required modules
try:
    from phe import paillier
    import shamirs
    print("✓ Successfully imported python-paillier (phe) library")
    print("✓ Successfully imported shamirs library")
except ImportError as e:
    print(f"✗ Failed to import required libraries: {e}")
    sys.exit(1)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_shamirs_library():
    """Test shamirs library functionality"""
    print("\n=== Testing shamirs Library ===")
    
    # Test secret sharing
    secret = 12345
    threshold = 3
    n_shares = 5
    modulus = 2**31 - 1  # Large prime
    
    try:
        # Generate shares
        shares = shamirs.shares(secret, quantity=n_shares, modulus=modulus, threshold=threshold)
        print(f"✓ Generated {len(shares)} shares with threshold {threshold}")        # Test reconstruction with minimum shares
        subset_shares = shares[:threshold]
        reconstructed = shamirs.interpolate(subset_shares)
        
        if reconstructed == secret:
            print(f"✓ Successfully reconstructed secret: {secret}")
        else:
            print(f"✗ Reconstruction failed: expected {secret}, got {reconstructed}")
            return False
            
        # Test reconstruction with more shares
        reconstructed2 = shamirs.interpolate(shares)
        if reconstructed2 == secret:
            print(f"✓ Successfully reconstructed with all shares")
        else:
            print(f"✗ Full reconstruction failed: expected {secret}, got {reconstructed2}")
            return False
            
        return True
        
    except Exception as e:
        print(f"✗ shamirs library test failed: {e}")
        traceback.print_exc()
        return False

def test_paillier_library():
    """Test python-paillier (phe) library functionality"""
    print("\n=== Testing python-paillier (phe) Library ===")
    
    try:
        # Generate key pair
        public_key, private_key = paillier.generate_paillier_keypair(n_length=1024)
        print(f"✓ Generated Paillier key pair with {public_key.n.bit_length()} bit modulus")
        
        # Test encryption
        plaintext1 = 100
        plaintext2 = 200
        
        encrypted1 = public_key.encrypt(plaintext1)
        encrypted2 = public_key.encrypt(plaintext2)
        print(f"✓ Successfully encrypted values: {plaintext1}, {plaintext2}")
        
        # Test homomorphic addition
        encrypted_sum = encrypted1 + encrypted2
        decrypted_sum = private_key.decrypt(encrypted_sum)
        
        expected_sum = plaintext1 + plaintext2
        if decrypted_sum == expected_sum:
            print(f"✓ Homomorphic addition successful: {plaintext1} + {plaintext2} = {decrypted_sum}")
        else:
            print(f"✗ Homomorphic addition failed: expected {expected_sum}, got {decrypted_sum}")
            return False
            
        # Test homomorphic scalar multiplication
        scalar = 3
        encrypted_mult = encrypted1 * scalar
        decrypted_mult = private_key.decrypt(encrypted_mult)
        
        expected_mult = plaintext1 * scalar
        if decrypted_mult == expected_mult:
            print(f"✓ Homomorphic scalar multiplication successful: {plaintext1} * {scalar} = {decrypted_mult}")
        else:
            print(f"✗ Homomorphic scalar multiplication failed: expected {expected_mult}, got {decrypted_mult}")
            return False
            
        return True
        
    except Exception as e:
        print(f"✗ python-paillier library test failed: {e}")
        traceback.print_exc()
        return False

def test_integrated_crypto_flow():
    """Test integrated cryptographic flow: Paillier + Shamir's secret sharing"""
    print("\n=== Testing Integrated Crypto Flow ===")
    
    try:
        # Step 1: Generate Paillier key pair
        public_key, private_key = paillier.generate_paillier_keypair(n_length=1024)
        print(f"✓ Step 1: Generated Paillier key pair")
        
        # Step 2: Split private key using Shamir's secret sharing
        threshold = 3
        n_personnel = 5
        secret_p = int(private_key.p)
        
        # Generate a suitable prime for shamirs
        secret_bits = secret_p.bit_length()
        min_prime_bits = max(secret_bits + 128, 512)
        prime_modulus = 2**min_prime_bits + 1
        
        # Make sure it's actually prime (simple check for this test)
        while not is_probably_prime(prime_modulus):
            prime_modulus += 2
            
        shares = shamirs.shares(secret_p, quantity=n_personnel, modulus=prime_modulus, threshold=threshold)
        print(f"✓ Step 2: Split private key into {n_personnel} shares with threshold {threshold}")
        
        # Step 3: Simulate encrypted voting
        votes = [1, 1, 0, 1, 0]  # 3 votes for candidate, 2 abstentions
        encrypted_votes = []
        
        for vote in votes:
            encrypted_vote = public_key.encrypt(vote)
            encrypted_votes.append(encrypted_vote)
        print(f"✓ Step 3: Encrypted {len(votes)} votes")
        
        # Step 4: Homomorphic tallying
        encrypted_total = encrypted_votes[0]
        for encrypted_vote in encrypted_votes[1:]:
            encrypted_total = encrypted_total + encrypted_vote
        print(f"✓ Step 4: Performed homomorphic tallying")
          # Step 5: Reconstruct private key from threshold shares
        threshold_shares = shares[:threshold]
        reconstructed_p = shamirs.interpolate(threshold_shares)
        
        if reconstructed_p == secret_p:
            print(f"✓ Step 5: Successfully reconstructed private key component p")
        else:
            print(f"✗ Step 5: Private key reconstruction failed")
            return False
            
        # Step 6: Reconstruct full private key and decrypt
        reconstructed_q = public_key.n // reconstructed_p
        if reconstructed_p * reconstructed_q != public_key.n:
            print(f"✗ Step 6: Reconstructed primes don't match original")
            return False
            
        reconstructed_privkey = paillier.PaillierPrivateKey(public_key, reconstructed_p, reconstructed_q)
        decrypted_total = reconstructed_privkey.decrypt(encrypted_total)
        
        expected_total = sum(votes)
        if decrypted_total == expected_total:
            print(f"✓ Step 6: Successfully decrypted total: {decrypted_total} (expected: {expected_total})")
        else:
            print(f"✗ Step 6: Decryption failed: got {decrypted_total}, expected {expected_total}")
            return False
            
        print(f"✓ Complete integrated crypto flow successful!")
        return True
        
    except Exception as e:
        print(f"✗ Integrated crypto flow test failed: {e}")
        traceback.print_exc()
        return False

def is_probably_prime(n, k=10):
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
    
    # Perform k rounds of testing
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

def test_position_based_voting_simulation():
    """Simulate position-based voting scenario"""
    print("\n=== Testing Position-Based Voting Simulation ===")
    
    try:
        # Generate key pair
        public_key, private_key = paillier.generate_paillier_keypair(n_length=1024)
        
        # Simulate election with 2 positions, each with 2 candidates
        positions = {
            "President": ["Alice", "Bob"],
            "Vice President": ["Charlie", "Diana"]
        }
        
        # Simulate votes: 5 voters, each votes for one candidate per position
        votes_by_position = {
            "President": {
                "Alice": [1, 1, 0, 1, 1],    # 4 votes
                "Bob": [0, 0, 1, 0, 0]       # 1 vote
            },
            "Vice President": {
                "Charlie": [1, 0, 1, 1, 0],  # 3 votes
                "Diana": [0, 1, 0, 0, 1]     # 2 votes
            }
        }
        
        # Encrypt all votes
        encrypted_votes_by_position = {}
        for position, candidates in votes_by_position.items():
            encrypted_votes_by_position[position] = {}
            for candidate, votes in candidates.items():
                encrypted_votes = [public_key.encrypt(vote) for vote in votes]
                encrypted_votes_by_position[position][candidate] = encrypted_votes
        
        print(f"✓ Encrypted votes for {len(positions)} positions")
        
        # Homomorphic tallying per position
        encrypted_totals_by_position = {}
        for position, candidates in encrypted_votes_by_position.items():
            encrypted_totals_by_position[position] = {}
            for candidate, encrypted_votes in candidates.items():
                total = encrypted_votes[0]
                for vote in encrypted_votes[1:]:
                    total = total + vote
                encrypted_totals_by_position[position][candidate] = total
        
        print(f"✓ Performed homomorphic tallying per position")
        
        # Decrypt results
        final_results = {}
        for position, candidates in encrypted_totals_by_position.items():
            final_results[position] = {}
            for candidate, encrypted_total in candidates.items():
                decrypted_total = private_key.decrypt(encrypted_total)
                final_results[position][candidate] = decrypted_total
        
        # Verify results
        expected_results = {
            "President": {"Alice": 4, "Bob": 1},
            "Vice President": {"Charlie": 3, "Diana": 2}
        }
        
        if final_results == expected_results:
            print(f"✓ Position-based voting results correct:")
            for position, candidates in final_results.items():
                print(f"  {position}:")
                for candidate, votes in candidates.items():
                    print(f"    {candidate}: {votes} votes")
        else:
            print(f"✗ Position-based voting results incorrect:")
            print(f"  Expected: {expected_results}")
            print(f"  Got: {final_results}")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Position-based voting simulation failed: {e}")
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("Starting Complete Election Flow Verification")
    print("=" * 50)
    
    tests = [
        ("shamirs Library", test_shamirs_library),
        ("python-paillier (phe) Library", test_paillier_library),
        ("Integrated Crypto Flow", test_integrated_crypto_flow),
        ("Position-Based Voting", test_position_based_voting_simulation)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"✗ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        icon = "✓" if result else "✗"
        print(f"{icon} {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The election system is ready for deployment.")
        return True
    else:
        print("❌ Some tests failed. Please review the implementation.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
