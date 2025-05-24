#!/usr/bin/env python3
"""
Advanced Crypto System Fix - Regenerates missing crypto data with proper validation
"""
import sys
import os
import json
import logging
import psycopg2
from phe import paillier
import shamirs
from datetime import datetime

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'phoniphaleia-voting',
    'user': 'postgres',
    'password': 'admin',
    'port': 5432
}

class AdvancedCryptoFix:
    def __init__(self):
        self.conn = None
        
    def connect_db(self):
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(**DB_CONFIG)
            logger.info("✓ Connected to PostgreSQL database")
            return True
        except Exception as e:
            logger.error(f"✗ Database connection failed: {e}")
            return False
    
    def regenerate_crypto_system(self, election_id=51):
        """
        Regenerate the entire crypto system with proper Paillier prime and Shamir modulus
        """
        try:
            logger.info(f"=== REGENERATING CRYPTO SYSTEM FOR ELECTION {election_id} ===")
            
            # Get current crypto config
            with self.conn.cursor() as cur:
                cur.execute("""
                    SELECT crypto_id, public_key, meta_data 
                    FROM crypto_configs 
                    WHERE election_id = %s
                """, (election_id,))
                crypto_row = cur.fetchone()
                
                if not crypto_row:
                    logger.error(f"No crypto config found for election {election_id}")
                    return False
                
                crypto_id, public_key_json, meta_data_json = crypto_row
                logger.info(f"Found crypto config {crypto_id}")
                
                # Parse existing public key
                public_key_data = json.loads(public_key_json)
                n = int(public_key_data['n'])
                logger.info(f"Public key n has {n.bit_length()} bits")
                
                # Generate new Paillier key pair with same n for consistency
                # Since we can't factor the existing n, we'll generate a completely new system
                logger.info("Generating new Paillier key pair...")
                public_key, private_key = paillier.generate_paillier_keypair(n_length=2048)
                
                priv_key_p = int(private_key.p)
                priv_key_q = int(private_key.q) 
                new_n = int(public_key.n)
                
                # CRITICAL VALIDATION: Ensure p*q = n
                if priv_key_p * priv_key_q != new_n:
                    logger.error(f"CRITICAL: Generated key is invalid: {priv_key_p} * {priv_key_q} != {new_n}")
                    return False
                
                logger.info(f"Generated new key pair:")
                logger.info(f"  - n: {new_n.bit_length()} bits")
                logger.info(f"  - p: {priv_key_p.bit_length()} bits") 
                logger.info(f"  - q: {priv_key_q.bit_length()} bits")
                logger.info(f"  - p*q = n: {priv_key_p * priv_key_q == new_n}")
                
                # Create Shamir modulus (prime larger than p)
                secret_bits = priv_key_p.bit_length()
                min_prime_bits = max(secret_bits + 128, 512)
                
                # Find a suitable prime for Shamir sharing
                import random
                while True:
                    candidate = random.getrandbits(min_prime_bits)
                    candidate |= (1 << min_prime_bits - 1)  # Ensure it's large enough
                    candidate |= 1  # Ensure it's odd
                    
                    if self.is_prime(candidate) and candidate > priv_key_p:
                        shamir_prime = candidate
                        break
                
                logger.info(f"Generated Shamir modulus: {shamir_prime.bit_length()} bits")
                
                # Generate Shamir shares (threshold 3, total 3)
                n_personnel = 3
                threshold = 3
                
                shares_raw = shamirs.shares(priv_key_p, quantity=n_personnel, modulus=shamir_prime, threshold=threshold)
                shares_serialized = [f"{share.index}:{hex(share.value)[2:]}" for share in shares_raw]
                
                # CRITICAL VALIDATION: Test reconstruction immediately
                reconstructed_test = shamirs.interpolate(shares_raw)
                if reconstructed_test != priv_key_p:
                    logger.error(f"CRITICAL: Immediate reconstruction test failed!")
                    logger.error(f"  Expected: {priv_key_p}")
                    logger.error(f"  Reconstructed: {reconstructed_test}")
                    return False
                
                logger.info(f"✓ Generated {len(shares_serialized)} Shamir shares with validated reconstruction")
                
                # Create comprehensive security data
                security_data = {
                    "n": str(new_n),
                    "p": str(priv_key_p),
                    "q": str(priv_key_q),
                    "p_times_q": str(priv_key_p * priv_key_q),
                    "prime_modulus": str(shamir_prime),
                    "key_bits": new_n.bit_length(),
                    "sharing_method": "direct_p",
                    "validation_passed": True,
                    "regeneration_timestamp": str(datetime.now())
                }
                
                # Create new public key JSON
                new_public_key_json = json.dumps({
                    'n': str(new_n),
                    'key_type': 'paillier', 
                    'bit_length': new_n.bit_length()
                })
                
                # Create comprehensive metadata
                meta_data = {
                    'crypto_type': 'paillier',
                    'n_personnel': n_personnel,
                    'threshold': threshold,
                    'p': str(priv_key_p),
                    'prime': str(shamir_prime),
                    'prime_modulus': str(shamir_prime),
                    'created_at': str(datetime.now()),
                    'sharing_method': 'direct_p',
                    'security_data': security_data,
                    'key_bits': new_n.bit_length(),
                    'validation_passed': True
                }
                
                new_meta_data_json = json.dumps(meta_data)
                  # Update crypto config in database
                cur.execute("""
                    UPDATE crypto_configs 
                    SET public_key = %s, meta_data = %s
                    WHERE crypto_id = %s
                """, (new_public_key_json, new_meta_data_json, crypto_id))
                
                logger.info("✓ Updated crypto config with new data")
                
                # Update key shares with new values  
                cur.execute("""
                    SELECT key_share_id, authority_id 
                    FROM key_shares 
                    WHERE crypto_id = %s 
                    ORDER BY authority_id
                """, (crypto_id,))
                
                key_share_rows = cur.fetchall()
                
                if len(key_share_rows) != len(shares_serialized):
                    logger.warning(f"Share count mismatch: DB has {len(key_share_rows)}, generated {len(shares_serialized)}")
                
                for i, (key_share_id, authority_id) in enumerate(key_share_rows):
                    if i < len(shares_serialized):
                        cur.execute("""
                            UPDATE key_shares 
                            SET share_value = %s 
                            WHERE key_share_id = %s
                        """, (shares_serialized[i], key_share_id))
                        logger.info(f"✓ Updated share for authority {authority_id}")
                
                self.conn.commit()
                logger.info("✓ All changes committed to database")
                
                # Test reconstruction
                if self.test_reconstruction(crypto_id, shares_serialized, shamir_prime, priv_key_p, new_n):
                    logger.info("✓ Reconstruction test PASSED")
                    return True
                else:
                    logger.error("✗ Reconstruction test FAILED") 
                    return False
                    
        except Exception as e:
            logger.error(f"✗ Error regenerating crypto system: {e}")
            if self.conn:
                self.conn.rollback()
            return False
    
    def is_prime(self, n, k=5):
        """Miller-Rabin primality test"""
        if n < 2: return False
        if n == 2 or n == 3: return True
        if n % 2 == 0: return False
        
        # Write n-1 as d * 2^r
        r = 0
        d = n - 1
        while d % 2 == 0:
            r += 1
            d //= 2
            
        # Witness loop
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
    
    def test_reconstruction(self, crypto_id, shares, shamir_prime, expected_p, n):
        """Test if shares can reconstruct the correct private key"""
        try:
            logger.info("Testing key reconstruction...")
            
            # Parse shares
            parsed_shares = []
            for share_str in shares:
                x_str, y_hex = share_str.split(':', 1)
                x = int(x_str)
                y = int(y_hex, 16)
                share_obj = shamirs.share(x, y, shamir_prime)
                parsed_shares.append(share_obj)
            
            # Reconstruct secret
            reconstructed_p = shamirs.interpolate(parsed_shares)
            
            # Verify
            if reconstructed_p == expected_p:
                logger.info(f"✓ Reconstructed p matches expected: {reconstructed_p}")
                
                # Verify it's a factor of n
                if n % reconstructed_p == 0:
                    reconstructed_q = n // reconstructed_p
                    if reconstructed_p * reconstructed_q == n:
                        logger.info(f"✓ p×q = n verification passed")
                        return True
                        
            logger.error(f"✗ Reconstruction verification failed")
            logger.error(f"  Expected p: {expected_p}")
            logger.error(f"  Reconstructed p: {reconstructed_p}")
            return False
            
        except Exception as e:
            logger.error(f"✗ Reconstruction test error: {e}")
            return False
    
    def export_shares_to_files(self, election_id=51):
        """Export the new shares to files for verification"""
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    SELECT ta.authority_name, ks.share_value
                    FROM key_shares ks
                    JOIN trusted_authorities ta ON ks.authority_id = ta.authority_id
                    JOIN crypto_configs cc ON ks.crypto_id = cc.crypto_id
                    WHERE cc.election_id = %s
                    ORDER BY ta.authority_name
                """, (election_id,))
                
                shares_data = cur.fetchall()
                
                for authority_name, share_value in shares_data:
                    filename = f"key_share_{authority_name}_new.txt"
                    with open(filename, 'w') as f:
                        f.write(f"Authority: {authority_name}\n")
                        f.write(f"Key Share:\n")
                        f.write(f"{share_value}\n")
                    logger.info(f"✓ Exported share for {authority_name} to {filename}")
                    
        except Exception as e:
            logger.error(f"✗ Error exporting shares: {e}")
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")

def main():
    print("Advanced Crypto System Fix")
    print("=" * 50)
    
    fixer = AdvancedCryptoFix()
    
    try:
        if not fixer.connect_db():
            return False
            
        success = fixer.regenerate_crypto_system(election_id=51)
        
        if success:
            logger.info("✓ Regenerating key shares export files...")
            fixer.export_shares_to_files(election_id=51)
            print("\n✓ CRYPTO SYSTEM REGENERATION SUCCESSFUL!")
            print("The system now has proper Paillier primes and Shamir modulus.")
            print("All key shares have been updated and can be used for reconstruction.")
        else:
            print("\n✗ CRYPTO SYSTEM REGENERATION FAILED!")
            return False
            
    except Exception as e:
        logger.error(f"✗ Fatal error: {e}")
        return False
    finally:
        fixer.close()
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
