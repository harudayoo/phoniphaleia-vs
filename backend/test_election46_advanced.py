#!/usr/bin/env python3
"""
Test script to debug key reconstruction for election ID 46 using the provided key shares.
This will help identify why we're getting "Reconstructed p does not divide n" error.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

import json
import logging
import base64
from phe import paillier
import shamirs
import sympy
import math

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Paths to key share files
KEY_SHARE_PATHS = [
    "../key_share_personnel_perso_1.txt",
    "../key_share_personnel_perso_2.txt", 
    "../key_share_personnel_perso_3.txt"
]

def read_key_shares(file_paths):
    """Read key shares from the provided text files"""
    shares = []
    for path in file_paths:
        try:
            with open(path, 'r') as f:
                content = f.read().strip().split('\n')
                # Extract the share from the third line which contains "Key Share:"
                if len(content) >= 3 and "Key Share:" in content[1]:
                    share = content[2].strip()
                    shares.append(share)
                    logger.info(f"Read share from {path}: {share[:10]}...{share[-10:]}")
                else:
                    logger.error(f"Unexpected format in {path}")
        except Exception as e:
            logger.error(f"Error reading share from {path}: {str(e)}")
    return shares

def try_reconstruct_with_different_primes(shares, n):
    """
    Try reconstructing the key with different prime moduli since we don't know 
    which one was used during generation.
    """
    # Parse shares to get the x and y values
    parsed_shares = []
    for share_str in shares:
        if ':' in share_str:
            x_str, y_hex = share_str.split(':', 1)
            x = int(x_str)
            y = int(y_hex, 16)
            parsed_shares.append((x, y))
            logger.info(f"Parsed share: x={x}, y_bits={y.bit_length()}, y={y}")
    
    # Common bit sizes for prime moduli
    common_bit_sizes = [512, 1024, 2048, 4096]
    candidates = []
    old_approach_candidates = []
    
    # Try common predefined primes
    common_primes = [
        # 512-bit prime
        13407807929942597099574024998205846127479365820592393377723561443721764030073546976801874298166903427690031858186486050853753882811946569946433649006083527,
        # 1024-bit prime (NIST P-1024)
        179769313486231590772930519078902473361797697894230657273430081157732675805500963132708477322407536021120113879871393357658789768814416622492847430639474124377767893424865485276302219601246094119453082952085005768838150682342462881473913110540827237163350510684586298239947245938479716304835356329624224137859,
        # 2048-bit prime (approximation, not a standard one)
        32317006071311007300714876688669951960444102669715484032130345427524655138867890893197201411522913463688717960921898019494119559150490921095088152386448283120630877367300996091750197750389652106796057638384067568276792218642619756161838094338476170470581645852036305042887575891541065808607552399123930385521914333389668342420684974786564569494856176035326322058077805659331026192708460314150258592864177116725943603718461857357598351152301645904403697613233287231227125684710820209725157101726931323469678542580656697935045997268352998638215525166389437335543602135433229604645318478604952148193555853611059596230656,
    ]
    
    # Standard approach: Try to reconstruct direct prime p
    for prime in common_primes:
        try:
            # Create shamirs.share objects
            shares_objs = [shamirs.share(x, y, prime) for x, y in parsed_shares]
            
            # Try to reconstruct with 2 shares (threshold = 2)
            for i in range(len(shares_objs)):
                for j in range(i+1, len(shares_objs)):
                    subset = [shares_objs[i], shares_objs[j]]
                    try:
                        reconstructed = shamirs.interpolate(subset)
                        result = {
                            'prime': prime,
                            'prime_bits': prime.bit_length(),
                            'shares_used': [i+1, j+1],  # 1-indexed for clarity
                            'reconstructed': reconstructed,
                            'divides_n': n % reconstructed == 0,
                            'reconstructed_bits': reconstructed.bit_length()
                        }
                        candidates.append(result)
                        logger.info(f"Candidate from prime {prime.bit_length()} bits with shares {i+1},{j+1}: "
                                   f"divides_n={result['divides_n']}, "
                                   f"reconstructed_bits={result['reconstructed_bits']}")
                    except Exception as e:
                        logger.warning(f"Interpolation failed with prime {prime.bit_length()} bits "
                                      f"and shares {i+1},{j+1}: {str(e)}")
        except Exception as e:
            logger.warning(f"Failed with prime {prime.bit_length()} bits: {str(e)}")
    
    # Try using all 3 shares together
    if len(parsed_shares) >= 3:
        logger.info("Trying reconstruction with all 3 shares together")
        for prime in common_primes:
            try:
                shares_objs = [shamirs.share(x, y, prime) for x, y in parsed_shares]
                reconstructed = shamirs.interpolate(shares_objs)
                result = {
                    'prime': prime,
                    'prime_bits': prime.bit_length(),
                    'shares_used': "all",
                    'reconstructed': reconstructed,
                    'divides_n': n % reconstructed == 0,
                    'reconstructed_bits': reconstructed.bit_length()
                }
                candidates.append(result)
                logger.info(f"Candidate from prime {prime.bit_length()} bits with all shares: "
                           f"divides_n={result['divides_n']}, "
                           f"reconstructed_bits={result['reconstructed_bits']}")
            except Exception as e:
                logger.warning(f"Interpolation failed with all shares using prime {prime.bit_length()} bits: {str(e)}")
    
    # Try the old approach (phi(n) or lambda(n) sharing)
    logger.info("Trying old approach reconstruction (phi/lambda sharing)...")
    
    for prime in common_primes:
        try:
            shares_objs = [shamirs.share(x, y, prime) for x, y in parsed_shares]
            
            # Try each combination of 2 shares
            for i in range(len(shares_objs)):
                for j in range(i+1, len(shares_objs)):
                    subset = [shares_objs[i], shares_objs[j]]
                    try:
                        reconstructed_lambda = shamirs.interpolate(subset)
                        
                        # Method 1: Try solving the quadratic equation
                        # If phi(n) = (p-1)(q-1) = n - (p+q) + 1
                        # Then p+q = n - phi(n) + 1
                        sum_pq = n - reconstructed_lambda + 1
                        
                        # Use quadratic formula: p,q = (p+q)/2 ± sqrt((p+q)^2 - 4n)/2
                        discriminant = sum_pq**2 - 4*n
                        
                        if discriminant > 0:
                            try:
                                sqrt_disc = math.isqrt(discriminant)
                                
                                p1 = (sum_pq + sqrt_disc) // 2
                                p2 = (sum_pq - sqrt_disc) // 2
                                
                                for p_candidate in [p1, p2]:
                                    if p_candidate > 0 and n % p_candidate == 0:
                                        q_candidate = n // p_candidate
                                        if p_candidate * q_candidate == n:
                                            old_approach_candidates.append({
                                                'approach': 'phi_n',
                                                'prime_modulus': prime,
                                                'prime_bits': prime.bit_length(),
                                                'shares_used': [i+1, j+1],
                                                'reconstructed_lambda': reconstructed_lambda,
                                                'p': p_candidate,
                                                'q': q_candidate
                                            })
                                            logger.info(f"OLD APPROACH SUCCESS with prime {prime.bit_length()} bits: "
                                                      f"reconstructed phi(n)={reconstructed_lambda.bit_length()} bits, "
                                                      f"found p={p_candidate.bit_length()} bits, q={q_candidate.bit_length()} bits")
                            except Exception as e:
                                logger.debug(f"Quadratic method failed: {str(e)}")
                        
                        # Method 2: Try GCD approach for lambda(n) = lcm(p-1, q-1)
                        try:
                            # If lambda(n) = lcm(p-1, q-1), then gcd(lambda(n), n) might be p-1 or q-1
                            gcd_result = math.gcd(reconstructed_lambda, n)
                            if gcd_result > 1:
                                # If gcd is p-1 or q-1, then p or q = gcd + 1
                                p_candidate = gcd_result + 1
                                if n % p_candidate == 0:
                                    q_candidate = n // p_candidate
                                    if p_candidate * q_candidate == n:
                                        old_approach_candidates.append({
                                            'approach': 'lambda_n_gcd',
                                            'prime_modulus': prime,
                                            'prime_bits': prime.bit_length(),
                                            'shares_used': [i+1, j+1],
                                            'reconstructed_lambda': reconstructed_lambda,
                                            'p': p_candidate,
                                            'q': q_candidate
                                        })
                                        logger.info(f"OLD APPROACH SUCCESS (GCD) with prime {prime.bit_length()} bits: "
                                                  f"found p={p_candidate.bit_length()} bits, q={q_candidate.bit_length()} bits")
                        except Exception as e:
                            logger.debug(f"GCD method failed: {str(e)}")
                    except Exception as e:
                        logger.debug(f"Old approach failed with shares {i+1},{j+1}: {str(e)}")
        except Exception as e:
            logger.debug(f"Old approach setup failed with prime {prime.bit_length()} bits: {str(e)}")
    
    return candidates, old_approach_candidates

def main():
    """Main function to test reconstruction for election ID 46"""
    try:
        # Read key shares from files
        shares = read_key_shares(KEY_SHARE_PATHS)
        if not shares or len(shares) < 2:
            logger.error(f"Not enough valid shares found: {len(shares)}")
            return False
        
        # Confirm the database election ID
        election_id = 46
        
        # For now, we'll use hardcoded values from the error messages
        public_key_n = 25700296273421246694249919195422463578456478705985945450676832150436894993287874438802018432018597275620178318921921047349286592596580271430096006842250645801829347137139229965378433619534801470040418393246649037438917276798995328413675917478760295118241904328635992522841203921637462392780662396406843847478633599939082391601153546938771139501069850476905503029129884030810678888873513343523304300972344352502051429451134611255951813221750203071245142717694272218341191880111859849635055227450745121978376648358448716805167472192841109743932448792322780582598409600879803551673141022457144516733217768581922804208711
        
        # Try reconstruction with different prime moduli
        candidates, old_approach_candidates = try_reconstruct_with_different_primes(shares, public_key_n)
        
        # Print summary of reconstruction attempts
        print("\n=== RECONSTRUCTION SUMMARY ===")
        print(f"Total standard candidates tried: {len(candidates)}")
        success_count = sum(1 for c in candidates if c['divides_n'])
        print(f"Successful standard candidates (divides n): {success_count}")
        
        print(f"\nTotal old approach candidates: {len(old_approach_candidates)}")
        
        if success_count > 0:
            print("\nSuccessful standard reconstructions:")
            for i, c in enumerate([c for c in candidates if c['divides_n']]):
                print(f"\nCandidate {i+1}:")
                print(f"  Prime modulus: {c['prime_bits']} bits")
                print(f"  Shares used: {c['shares_used']}")
                print(f"  Reconstructed p: {c['reconstructed_bits']} bits")
                p = c['reconstructed']
                q = public_key_n // p
                print(f"  Derived q: {q.bit_length()} bits")
                print(f"  p < q: {p < q}")
                print(f"  p * q == n: {p * q == public_key_n}")
        
        if old_approach_candidates:
            print("\nSuccessful old approach reconstructions:")
            for i, c in enumerate(old_approach_candidates):
                print(f"\nOld approach candidate {i+1}:")
                print(f"  Approach: {c['approach']}")
                print(f"  Prime modulus: {c['prime_bits']} bits")
                print(f"  Shares used: {c['shares_used']}")
                p = c['p']
                q = c['q']
                print(f"  Derived p: {p.bit_length()} bits")
                print(f"  Derived q: {q.bit_length()} bits")
                print(f"  p < q: {p < q}")
                print(f"  p * q == n: {p * q == public_key_n}")
                
                # If we found a solution, suggest a fix for the reconstruct_private_key method
                if p * q == public_key_n:
                    print("\n=== SOLUTION FOUND! ===")
                    print(f"The key shares are using the OLD approach (phi/lambda sharing)")
                    print("This explains why the 'Reconstructed p does not divide n' error occurs.")
                    print("\nSuggested fix for reconstruct_private_key method:")
                    print("1. The key shares are using phi(n) or lambda(n) sharing, not prime p directly")
                    print("2. In the code, try both approaches:")
                    print("   a. First try to reconstruct p directly and check if it divides n")
                    print("   b. If that fails, try the old approach with phi(n)/lambda(n) reconstruction")
                    
                    # Provide code snippets for the solution
                    print("\nExample code snippet for reconstruction:")
                    if c['approach'] == 'phi_n':
                        print("""
# After reconstructing the secret (likely phi(n))
reconstructed_phi_n = shamirs.interpolate(parsed_shares)

# Use quadratic formula to find p and q
sum_pq = public_key_n - reconstructed_phi_n + 1
discriminant = sum_pq**2 - 4*public_key_n

# Find p and q
if discriminant > 0:
    sqrt_disc = math.isqrt(discriminant)
    p_candidate1 = (sum_pq + sqrt_disc) // 2
    p_candidate2 = (sum_pq - sqrt_disc) // 2
    
    # Check which one works
    for p in [p_candidate1, p_candidate2]:
        if public_key_n % p == 0:
            q = public_key_n // p
            if p * q == public_key_n:
                # Use these primes to create a private key
                private_key = paillier.PaillierPrivateKey(paillier.PaillierPublicKey(public_key_n), p, q)
                break
""")
                    elif c['approach'] == 'lambda_n_gcd':
                        print("""
# After reconstructing the secret (likely lambda(n))
reconstructed_lambda = shamirs.interpolate(parsed_shares)

# Try GCD approach
gcd_result = math.gcd(reconstructed_lambda, public_key_n)
if gcd_result > 1:
    p_candidate = gcd_result + 1
    if public_key_n % p_candidate == 0:
        q_candidate = public_key_n // p_candidate
        if p_candidate * q_candidate == public_key_n:
            # Use these primes to create a private key
            private_key = paillier.PaillierPrivateKey(paillier.PaillierPublicKey(public_key_n), p_candidate, q_candidate)
""")
        
        if not success_count and not old_approach_candidates:
            print("\nNo successful reconstructions found!")
            print("Most likely reasons for failure:")
            print("1. The shares were generated with a different modulus prime than what we tried")
            print("2. The threshold value is higher than 2 (we tried pairs of shares)")
            print("3. The shares use a different format or encoding than expected")
            print("4. The shares are corrupted or in an unexpected format")
        
        return success_count > 0 or len(old_approach_candidates) > 0
    
    except Exception as e:
        logger.error(f"Error in main function: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = main()
    print(f"\nTest {'PASSED' if success else 'FAILED'}")
    sys.exit(0 if success else 1)
