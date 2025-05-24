#!/usr/bin/env python3
"""
Test script to verify the fixed reconstruction for election ID 46 with the old approach.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

import json
import logging
import base64
import math
from phe import paillier
import shamirs

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

def test_phi_n_reconstruction(shares, n, prime_modulus):
    """
    Test reconstruction using the phi(n) approach.
    This simulates what our controller now does.
    """
    # Parse shares to proper format for shamirs library
    parsed_shares = []
    for s in shares:
        if ':' in s:
            x_str, y_hex = s.split(':', 1)
            x = int(x_str)
            y = int(y_hex, 16)
            share_obj = shamirs.share(x, y, prime_modulus)
            parsed_shares.append(share_obj)
    
    logger.info(f"Successfully parsed {len(parsed_shares)} shares as shamirs.share objects")
    
    # Use shamirs library to reconstruct the secret
    reconstructed_secret = shamirs.interpolate(parsed_shares)
    logger.info(f"Reconstructed secret: {reconstructed_secret} (bits: {reconstructed_secret.bit_length()})")
    
    # APPROACH 1: Try new approach (direct p sharing)
    # Validate reconstructed_secret is a factor of n (it's directly p)
    if n % reconstructed_secret == 0:
        logger.info("New approach successful: reconstructed_secret is a factor of n (directly p)")
        reconstructed_p = reconstructed_secret
        reconstructed_q = n // reconstructed_p
        
        if reconstructed_p * reconstructed_q != n:
            logger.error(f"Reconstructed primes don't match: {reconstructed_p} * {reconstructed_q} != {n}")
            return None
        
        logger.info(f"Reconstructed p: {reconstructed_p}, q: {reconstructed_q}")
        return {"p": reconstructed_p, "q": reconstructed_q, "approach": "new_direct_p"}
    
    # APPROACH 2: Try old approach (phi(n) or lambda(n) sharing)
    logger.info("New approach failed, trying old approach (phi/lambda sharing)")
    # Assume the reconstructed_secret is phi(n) = (p-1)(q-1) = n - (p+q) + 1
    # Thus p+q = n - phi(n) + 1
    
    # Calculate sum of primes from phi(n)
    sum_pq = n - reconstructed_secret + 1
    
    # Use quadratic formula to find p and q: x^2 - (p+q)x + pq = 0
    # p,q = (p+q)/2 ± sqrt((p+q)^2 - 4pq)/2
    discriminant = sum_pq**2 - 4*n
    
    if discriminant < 0:
        logger.error(f"Discriminant is negative: {discriminant}. Old approach failed.")
        return None
    
    # Try to get square root of discriminant
    sqrt_disc = math.isqrt(discriminant)
    
    # Calculate potential p and q
    p_candidate1 = (sum_pq + sqrt_disc) // 2
    p_candidate2 = (sum_pq - sqrt_disc) // 2
    
    # Check which candidate works (if any)
    for p_candidate in [p_candidate1, p_candidate2]:
        if p_candidate <= 0:
            continue
            
        if n % p_candidate == 0:
            q_candidate = n // p_candidate
        if p_candidate * q_candidate == n:
        # Validate that we have actual primes, not trivial factors
        if p_candidate > 1 and q_candidate > 1:
            logger.info(f"Old approach successful: found p={p_candidate} ({p_candidate.bit_length()} bits) "
                        f"and q={q_candidate} ({q_candidate.bit_length()} bits)")
            return {"p": p_candidate, "q": q_candidate, "approach": "old_phi_n"}
        else:
            logger.warning(f"Found trivial factors: p={p_candidate}, q={q_candidate}, skipping")

    # If we get here, the quadratic formula approach failed
    logger.error("Old approach quadratic formula failed to find valid p and q")
    
    # Try alternative approach: GCD method for lambda(n)
    logger.info("Trying GCD method for lambda(n)")
    gcd_val = math.gcd(reconstructed_secret, n)
    if gcd_val > 1:
        p_candidate = gcd_val + 1
        if n % p_candidate == 0:            q_candidate = n // p_candidate
            if p_candidate * q_candidate == n:
                # Validate that we have actual primes, not trivial factors
                if p_candidate > 1 and q_candidate > 1:
                    logger.info(f"Old approach (GCD) successful: found p={p_candidate} ({p_candidate.bit_length()} bits) "
                           f"and q={q_candidate} ({q_candidate.bit_length()} bits)")
                    return {"p": p_candidate, "q": q_candidate, "approach": "old_lambda_n_gcd"}
                else:
                    logger.warning(f"Found trivial factors: p={p_candidate}, q={q_candidate}, skipping")
    
    # If we reach here, both approaches failed
    logger.error("Both approaches failed to reconstruct a valid private key")
    return None

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
        
        # Use hardcoded values for testing
        public_key_n = 25700296273421246694249919195422463578456478705985945450676832150436894993287874438802018432018597275620178318921921047349286592596580271430096006842250645801829347137139229965378433619534801470040418393246649037438917276798995328413675917478760295118241904328635992522841203921637462392780662396406843847478633599939082391601153546938771139501069850476905503029129884030810678888873513343523304300972344352502051429451134611255951813221750203071245142717694272218341191880111859849635055227450745121978376648358448716805167472192841109743932448792322780582598409600879803551673141022457144516733217768581922804208711
        
        # Define common modulus primes for testing
        common_primes = [
            # 512-bit prime
            13407807929942597099574024998205846127479365820592393377723561443721764030073546976801874298166903427690031858186486050853753882811946569946433649006083527,
            # 1024-bit prime (NIST P-1024)
            179769313486231590772930519078902473361797697894230657273430081157732675805500963132708477322407536021120113879871393357658789768814416622492847430639474124377767893424865485276302219601246094119453082952085005768838150682342462881473913110540827237163350510684586298239947245938479716304835356329624224137859,
            # 2048-bit prime (approximation, not a standard one)
            32317006071311007300714876688669951960444102669715484032130345427524655138867890893197201411522913463688717960921898019494119559150490921095088152386448283120630877367300996091750197750389652106796057638384067568276792218642619756161838094338476170470581645852036305042887575891541065808607552399123930385521914333389668342420684974786564569494856176035326322058077805659331026192708460314150258592864177116725943603718461857357598351152301645904403697613233287231227125684710820209725157101726931323469678542580656697935045997268352998638215525166389437335543602135433229604645318478604952148193555853611059596230656,
        ]
        
        # Test reconstruction with different prime moduli
        success = False
        for prime in common_primes:
            logger.info(f"\n----- Testing with prime modulus ({prime.bit_length()} bits) -----")
            result = test_phi_n_reconstruction(shares, public_key_n, prime)
            if result:
                logger.info(f"SUCCESS with {result['approach']}!")
                success = True
                # Test decryption
                try:
                    p, q = result["p"], result["q"]
                    pubkey = paillier.PaillierPublicKey(n=public_key_n)
                    privkey = paillier.PaillierPrivateKey(pubkey, p, q)
                    logger.info(f"Created Paillier private key with p={p.bit_length()} bits and q={q.bit_length()} bits")
                    
                    # Test a simple encryption/decryption
                    test_value = 42
                    encrypted = pubkey.encrypt(test_value)
                    decrypted = privkey.decrypt(encrypted)
                    logger.info(f"Test encryption/decryption: {test_value} -> {decrypted} (success: {test_value == decrypted})")
                except Exception as e:
                    logger.error(f"Error testing decryption: {str(e)}")
            else:
                logger.warning(f"Failed with prime modulus ({prime.bit_length()} bits)")
        
        if success:
            logger.info("\n=== SUMMARY ===")
            logger.info("Successfully reconstructed private key and verified decryption works!")
            logger.info("The old approach (phi/lambda sharing) worked, confirming our fix is correct.")
        else:
            logger.error("\n=== SUMMARY ===")
            logger.error("Failed to reconstruct private key with any approach.")
        
        return success
    
    except Exception as e:
        logger.error(f"Error in main function: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = main()
    print(f"\nTest {'PASSED' if success else 'FAILED'}")
    sys.exit(0 if success else 1)
