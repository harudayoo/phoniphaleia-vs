#!/usr/bin/env python3
"""
Comprehensive Crypto System Fix and Verification Script
======================================================

This script will:
1. Connect to the PostgreSQL database
2. Examine the current crypto configuration for election 51
3. Identify and fix data consistency issues
4. Test key reconstruction with the existing shares
5. Update the database with corrected security data
6. Verify the complete crypto flow works properly

Author: Assistant
Date: May 24, 2025
"""

import os
import sys
import json
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import traceback

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Import required crypto libraries
try:
    from phe import paillier
    print("✓ phe (python-paillier) library imported successfully")
except ImportError as e:
    print(f"✗ Failed to import phe library: {e}")
    sys.exit(1)

try:
    import shamirs
    print("✓ shamirs library imported successfully")
except ImportError as e:
    print(f"✗ Failed to import shamirs library: {e}")
    sys.exit(1)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'phoniphaleia-voting',
    'user': 'postgres',
    'password': 'admin',
    'port': 5432
}

class CryptoSystemFixer:
    def __init__(self):
        self.conn = None
        self.election_id = 51
        self.crypto_id = 59
        
    def connect_db(self):
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(**DB_CONFIG)
            logger.info("✓ Connected to PostgreSQL database successfully")
            return True
        except Exception as e:
            logger.error(f"✗ Failed to connect to database: {e}")
            return False
    
    def get_crypto_config(self):
        """Retrieve the current crypto configuration"""
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT crypto_id, election_id, public_key, meta_data, key_type, status, created_at
                    FROM crypto_configs 
                    WHERE election_id = %s
                """, (self.election_id,))
                
                result = cur.fetchone()
                if result:
                    logger.info(f"✓ Found crypto config: {dict(result)}")
                    return dict(result)
                else:
                    logger.error(f"✗ No crypto config found for election {self.election_id}")
                    return None
        except Exception as e:
            logger.error(f"✗ Error retrieving crypto config: {e}")
            return None
    
    def get_key_shares(self):
        """Retrieve key shares for the crypto configuration"""
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT ks.key_share_id, ks.crypto_id, ks.authority_id, ks.share_value, 
                           ta.authority_name, ks.created_at
                    FROM key_shares ks
                    JOIN trusted_authorities ta ON ks.authority_id = ta.authority_id
                    WHERE ks.crypto_id = %s
                    ORDER BY ks.authority_id
                """, (self.crypto_id,))
                
                results = cur.fetchall()
                key_shares = [dict(row) for row in results]
                logger.info(f"✓ Found {len(key_shares)} key shares")
                for share in key_shares:
                    logger.info(f"  - Authority: {share['authority_name']}, Share: {share['share_value'][:50]}...")
                return key_shares
        except Exception as e:
            logger.error(f"✗ Error retrieving key shares: {e}")
            return []
    
    def analyze_current_state(self):
        """Analyze the current state of the crypto system"""
        logger.info("=== ANALYZING CURRENT CRYPTO SYSTEM STATE ===")
        
        # Get crypto config
        crypto_config = self.get_crypto_config()
        if not crypto_config:
            return False
        
        # Parse public key
        try:
            public_key_data = json.loads(crypto_config['public_key'])
            n = int(public_key_data['n'])
            logger.info(f"✓ Public key n: {n} (bits: {n.bit_length()})")
        except Exception as e:
            logger.error(f"✗ Error parsing public key: {e}")
            return False
        
        # Parse metadata
        try:
            meta_data = json.loads(crypto_config['meta_data'])
            logger.info(f"✓ Metadata parsed successfully")
            logger.info(f"  - Crypto type: {meta_data.get('crypto_type')}")
            logger.info(f"  - Threshold: {meta_data.get('threshold')}")
            logger.info(f"  - Personnel: {meta_data.get('n_personnel')}")
            logger.info(f"  - Sharing method: {meta_data.get('sharing_method')}")
            
            # Check for critical data
            security_data = meta_data.get('security_data', {})
            logger.info(f"  - Security data keys: {list(security_data.keys())}")
            
            # Check for Paillier prime p
            p_value = meta_data.get('p') or security_data.get('p')
            if p_value:
                logger.info(f"✓ Paillier prime p found: {str(p_value)[:50]}...")
            else:
                logger.warning("⚠ Paillier prime p NOT FOUND - this is a critical issue!")
            
            # Check for Shamir modulus
            prime_modulus = (meta_data.get('prime') or 
                           meta_data.get('prime_modulus') or 
                           security_data.get('prime_modulus'))
            if prime_modulus:
                logger.info(f"✓ Shamir modulus found: {str(prime_modulus)[:50]}...")
            else:
                logger.warning("⚠ Shamir modulus NOT FOUND - this is a critical issue!")
                
        except Exception as e:
            logger.error(f"✗ Error parsing metadata: {e}")
            return False
        
        # Get key shares
        key_shares = self.get_key_shares()
        if not key_shares:
            logger.error("✗ No key shares found")
            return False
        
        return {
            'crypto_config': crypto_config,
            'public_key_data': public_key_data,
            'meta_data': meta_data,
            'key_shares': key_shares,
            'n': n
        }
    
    def generate_missing_crypto_data(self, n):
        """Generate missing cryptographic data by factoring n"""
        logger.info("=== GENERATING MISSING CRYPTO DATA ===")
        
        try:
            # Try to factor n to find p and q
            logger.info(f"Attempting to factor n = {n}")
            
            # For testing purposes, let's try a simple approach first
            # In a real scenario, we might need more sophisticated factoring
            
            # Check if n is the product of two primes
            import math
            
            # Try trial division for small factors first
            for i in range(2, min(100000, int(math.sqrt(n)) + 1)):
                if n % i == 0:
                    p = i
                    q = n // i
                    logger.info(f"✓ Found factors: p = {p}, q = {q}")
                    
                    # Verify p and q are prime-like (for Paillier, they should be large primes)
                    if p.bit_length() > 500 and q.bit_length() > 500:
                        logger.info(f"✓ Factors are large enough for Paillier cryptosystem")
                        return p, q
                    else:
                        logger.warning(f"⚠ Factors are too small for secure Paillier cryptosystem")
                        continue
            
            # If simple factoring doesn't work, we need the original private key
            logger.error("✗ Could not factor n with simple methods")
            logger.info("This suggests n is properly constructed with large prime factors")
            logger.info("We need to reconstruct p from the existing key shares")
            
            return None, None
            
        except Exception as e:
            logger.error(f"✗ Error in factoring: {e}")
            return None, None
    
    def test_key_reconstruction_with_current_shares(self, analysis_result):
        """Test key reconstruction using the current shares in database"""
        logger.info("=== TESTING KEY RECONSTRUCTION WITH CURRENT SHARES ===")
        
        try:
            key_shares = analysis_result['key_shares']
            meta_data = analysis_result['meta_data']
            n = analysis_result['n']
            
            # Extract shares in the format stored in database
            shares_data = []
            for share_info in key_shares:
                share_value = share_info['share_value']
                authority_name = share_info['authority_name']
                logger.info(f"Processing share for {authority_name}: {share_value}")
                shares_data.append(share_value)
            
            # Try to get the Shamir modulus from metadata
            security_data = meta_data.get('security_data', {})
            prime_modulus = None
            
            # Check multiple possible locations for the prime modulus
            for key in ['prime_modulus', 'prime', 'modulus']:
                if key in meta_data and meta_data[key]:
                    try:
                        prime_modulus = int(meta_data[key])
                        logger.info(f"✓ Found Shamir modulus in meta_data[{key}]: {prime_modulus}")
                        break
                    except (ValueError, TypeError):
                        continue
            
            if not prime_modulus and security_data:
                for key in ['prime_modulus', 'prime', 'modulus']:
                    if key in security_data and security_data[key]:
                        try:
                            prime_modulus = int(security_data[key])
                            logger.info(f"✓ Found Shamir modulus in security_data[{key}]: {prime_modulus}")
                            break
                        except (ValueError, TypeError):
                            continue
            
            if not prime_modulus:
                logger.error("✗ No Shamir modulus found - cannot reconstruct key")
                return False
            
            # Parse shares for shamirs library
            parsed_shares = []
            for share_str in shares_data:
                try:
                    if ':' in share_str:
                        x_str, y_hex = share_str.split(':', 1)
                        x = int(x_str)
                        y = int(y_hex, 16)  # Assuming hex format
                        share_obj = shamirs.share(x, y, prime_modulus)
                        parsed_shares.append(share_obj)
                        logger.info(f"✓ Parsed share: x={x}, y={y} (hex length: {len(y_hex)})")
                    else:
                        logger.warning(f"⚠ Unexpected share format: {share_str}")
                except Exception as e:
                    logger.error(f"✗ Error parsing share {share_str}: {e}")
                    continue
            
            if len(parsed_shares) < 3:
                logger.error(f"✗ Not enough valid shares parsed: {len(parsed_shares)}")
                return False
            
            # Attempt reconstruction
            try:
                reconstructed_secret = shamirs.interpolate(parsed_shares)
                logger.info(f"✓ Successfully reconstructed secret: {reconstructed_secret}")
                logger.info(f"  Secret bit length: {reconstructed_secret.bit_length()}")
                
                # Test if reconstructed secret is a factor of n
                if n % reconstructed_secret == 0:
                    p = reconstructed_secret
                    q = n // p
                    logger.info(f"✓ Reconstructed secret is a valid factor of n!")
                    logger.info(f"  p = {p}")
                    logger.info(f"  q = {q}")
                    logger.info(f"  p * q = {p * q}")
                    logger.info(f"  n = {n}")
                    logger.info(f"  Match: {p * q == n}")
                    
                    return {
                        'success': True,
                        'p': p,
                        'q': q,
                        'prime_modulus': prime_modulus,
                        'reconstructed_secret': reconstructed_secret
                    }
                else:
                    logger.warning(f"⚠ Reconstructed secret is not a factor of n")
                    logger.info(f"  n % secret = {n % reconstructed_secret}")
                    
                    # Try some adjustments
                    for adjustment in [1, -1]:
                        test_p = reconstructed_secret + adjustment
                        if n % test_p == 0:
                            p = test_p
                            q = n // p
                            logger.info(f"✓ Found valid factor with adjustment {adjustment}: p = {p}")
                            return {
                                'success': True,
                                'p': p,
                                'q': q,
                                'prime_modulus': prime_modulus,
                                'reconstructed_secret': reconstructed_secret,
                                'adjustment': adjustment
                            }
                    
                    logger.error("✗ Could not find a valid factor even with adjustments")
                    return False
                    
            except Exception as e:
                logger.error(f"✗ Error during reconstruction: {e}")
                logger.error(traceback.format_exc())
                return False
            
        except Exception as e:
            logger.error(f"✗ Error in key reconstruction test: {e}")
            logger.error(traceback.format_exc())
            return False
    
    def fix_metadata_with_reconstructed_data(self, reconstruction_result, analysis_result):
        """Update the database metadata with the reconstructed cryptographic data"""
        logger.info("=== FIXING METADATA WITH RECONSTRUCTED DATA ===")
        
        try:
            if not reconstruction_result or not reconstruction_result.get('success'):
                logger.error("✗ No valid reconstruction result to fix metadata")
                return False
            
            p = reconstruction_result['p']
            q = reconstruction_result['q']
            prime_modulus = reconstruction_result['prime_modulus']
            
            # Get current metadata
            meta_data = analysis_result['meta_data'].copy()
            
            # Update security_data with all necessary information
            security_data = {
                "n": str(analysis_result['n']),
                "p": str(p),
                "q": str(q),
                "p_times_q": str(p * q),
                "prime_modulus": str(prime_modulus),
                "key_bits": analysis_result['n'].bit_length(),
                "sharing_method": "direct_p"
            }
            
            # Update metadata
            meta_data.update({
                'p': str(p),
                'prime': str(prime_modulus),
                'prime_modulus': str(prime_modulus),
                'security_data': security_data,
                'sharing_method': 'direct_p',
                'fixed_at': str(datetime.utcnow()),
                'fix_applied': True
            })
            
            # Update database
            with self.conn.cursor() as cur:
                cur.execute("""
                    UPDATE crypto_configs 
                    SET meta_data = %s
                    WHERE crypto_id = %s
                """, (json.dumps(meta_data), self.crypto_id))
                
                self.conn.commit()
                logger.info("✓ Successfully updated crypto config metadata")
                logger.info(f"  Updated security_data with p, q, and prime_modulus")
                logger.info(f"  p = {str(p)[:50]}...")
                logger.info(f"  prime_modulus = {str(prime_modulus)[:50]}...")
                
                return True
                
        except Exception as e:
            logger.error(f"✗ Error updating metadata: {e}")
            logger.error(traceback.format_exc())
            self.conn.rollback()
            return False
    
    def verify_complete_crypto_flow(self):
        """Verify the complete crypto flow works after fixes"""
        logger.info("=== VERIFYING COMPLETE CRYPTO FLOW ===")
        
        try:
            # Re-analyze the state after fixes
            analysis_result = self.analyze_current_state()
            if not analysis_result:
                logger.error("✗ Failed to re-analyze crypto state")
                return False
            
            # Test reconstruction again
            reconstruction_result = self.test_key_reconstruction_with_current_shares(analysis_result)
            if not reconstruction_result or not reconstruction_result.get('success'):
                logger.error("✗ Key reconstruction still fails after fixes")
                return False
            
            # Test encryption/decryption cycle
            logger.info("Testing encryption/decryption cycle...")
            
            n = analysis_result['n']
            p = reconstruction_result['p']
            q = reconstruction_result['q']
            
            # Create Paillier keys
            public_key = paillier.PaillierPublicKey(n=n)
            private_key = paillier.PaillierPrivateKey(public_key=public_key, p=p, q=q)
            
            # Test encryption/decryption
            test_value = 42
            encrypted = public_key.encrypt(test_value)
            decrypted = private_key.decrypt(encrypted)
            
            if decrypted == test_value:
                logger.info(f"✓ Encryption/decryption test passed: {test_value} -> encrypted -> {decrypted}")
            else:
                logger.error(f"✗ Encryption/decryption test failed: {test_value} -> encrypted -> {decrypted}")
                return False
            
            # Test homomorphic addition
            val1, val2 = 10, 20
            enc1 = public_key.encrypt(val1)
            enc2 = public_key.encrypt(val2)
            enc_sum = enc1 + enc2
            decrypted_sum = private_key.decrypt(enc_sum)
            
            if decrypted_sum == val1 + val2:
                logger.info(f"✓ Homomorphic addition test passed: {val1} + {val2} = {decrypted_sum}")
            else:
                logger.error(f"✗ Homomorphic addition test failed: {val1} + {val2} != {decrypted_sum}")
                return False
            
            logger.info("✓ Complete crypto flow verification successful!")
            return True
            
        except Exception as e:
            logger.error(f"✗ Error in crypto flow verification: {e}")
            logger.error(traceback.format_exc())
            return False
    
    def run_comprehensive_fix(self):
        """Run the comprehensive crypto system fix"""
        logger.info("=== STARTING COMPREHENSIVE CRYPTO SYSTEM FIX ===")
        
        # Connect to database
        if not self.connect_db():
            return False
        
        try:
            # Step 1: Analyze current state
            analysis_result = self.analyze_current_state()
            if not analysis_result:
                logger.error("✗ Failed to analyze current crypto state")
                return False
            
            # Step 2: Test reconstruction with current shares
            reconstruction_result = self.test_key_reconstruction_with_current_shares(analysis_result)
            if not reconstruction_result or not reconstruction_result.get('success'):
                logger.error("✗ Key reconstruction failed with current shares")
                
                # Try to generate missing data
                p, q = self.generate_missing_crypto_data(analysis_result['n'])
                if not p or not q:
                    logger.error("✗ Could not generate missing crypto data")
                    return False
                
                # Update reconstruction result
                reconstruction_result = {
                    'success': True,
                    'p': p,
                    'q': q,
                    'prime_modulus': None  # We'll need to determine this
                }
            
            # Step 3: Fix metadata
            if not self.fix_metadata_with_reconstructed_data(reconstruction_result, analysis_result):
                logger.error("✗ Failed to fix metadata")
                return False
            
            # Step 4: Verify complete crypto flow
            if not self.verify_complete_crypto_flow():
                logger.error("✗ Crypto flow verification failed")
                return False
            
            logger.info("✓ COMPREHENSIVE CRYPTO SYSTEM FIX COMPLETED SUCCESSFULLY!")
            return True
            
        except Exception as e:
            logger.error(f"✗ Error in comprehensive fix: {e}")
            logger.error(traceback.format_exc())
            return False
        finally:
            if self.conn:
                self.conn.close()
                logger.info("Database connection closed")

def main():
    """Main function"""
    print("Comprehensive Crypto System Fix and Verification")
    print("=" * 50)
    
    fixer = CryptoSystemFixer()
    success = fixer.run_comprehensive_fix()
    
    if success:
        print("\n✓ CRYPTO SYSTEM FIX COMPLETED SUCCESSFULLY!")
        print("The Paillier key generation, Shamir's secret sharing,")
        print("key reconstruction, and decryption should now work properly.")
    else:
        print("\n✗ CRYPTO SYSTEM FIX FAILED!")
        print("Please check the logs above for specific error details.")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
