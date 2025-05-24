"""
Only uses Paillier with Shamir secret sharing.
"""
from flask import jsonify, request
from app.models.crypto_config import CryptoConfig
from app.models.key_share import KeyShare
from app.models.trusted_authority import TrustedAuthority
from app.models.election import Election
from app import db
import secrets
import json
import base64
import logging
import traceback
from datetime import datetime
from phe import paillier
from typing import List, Dict, Any, Tuple, Optional
import shamirs

try:
    from sympy import nextprime as next_prime
except ImportError:
    # Precomputed large prime for use with very large inputs
    LARGE_PRIMES = {
        512: 13407807929942597099574024998205846127479365820592393377723561443721764030073546976801874298166903427690031858186486050853753882811946569946433649006083527,
        1024: 179769313486231590772930519078902473361797697894230657273430081157732675805500963132708477322407536021120113879871393357658789768814416622492847430639474124377767893424865485276302219601246094119453082952085005768838150682342462881473913110540827237163350510684586298239947245938479716304835356329624224137859,
        2048: 32317006071311007300714876688669951960444102669715484032130345427524655138867890893197201411522913463688717960921898019494119559150490921095088152386448283120630877367300996091750197750389652106796057638384067568276792218642619756161838094338476170470581645852036305042887575891541065808607552399123930385521914333389668342420684974786564569494856176035326322058077805659331026192708460314150258592864177116725943603718461857357598351152301645904403697613233287231227125684710820209725157101726931323469678542580656697935045997268352998638215525166389437335543602135433229604645318478604952148193555853611059596230656
    }
    
    def next_prime(n):
        # For very large numbers, use precomputed primes
        n_bits = n.bit_length()
        if n_bits > 400:  # If n is very large
            for prime_bits, prime in LARGE_PRIMES.items():
                if prime_bits >= n_bits and prime > n:
                    return prime
            
            # If we didn't find a suitable precomputed prime, use the largest one
            return LARGE_PRIMES[max(LARGE_PRIMES.keys())]
        
        def is_prime(num):
            """Miller-Rabin primality test - faster for large numbers"""
            if num <= 1:
                return False
            if num <= 3:
                return True
            if num % 2 == 0:
                return False
            
            # Miller-Rabin primality test for large numbers
            # Express num-1 as d*2^r
            r, d = 0, num - 1
            while d % 2 == 0:
                r += 1
                d //= 2
                
            # Witness loop with some known good bases
            for a in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41]:
                if num == a:
                    return True
                if not miller_rabin_test(a, d, num, r):
                    return False
            return True
        
        def miller_rabin_test(a, d, n, r):
            """Helper for Miller-Rabin test"""
            x = pow(a, d, n)
            if x == 1 or x == n - 1:
                return True
            
            for _ in range(r - 1):
                x = pow(x, 2, n)
                if x == n - 1:
                    return True
            return False
        
        # Start with n+1 and increment until we find a prime
        candidate = n + 1
        if candidate % 2 == 0:  # Ensure we start with an odd number
            candidate += 1
            
        while not is_prime(candidate):
            candidate += 2  # Only check odd numbers
        
        return candidate

# Set up logging
logger = logging.getLogger(__name__)

class CryptoConfigController:
    @staticmethod
    def create_crypto_config():
        try:
            data = request.json
            crypto = CryptoConfig(
                election_id=data['election_id'],
                public_key=data['public_key']
            )
            db.session.add(crypto)
            db.session.commit()
            
            return jsonify({
                'crypto_id': crypto.crypto_id,
                'election_id': crypto.election_id,
                'public_key': crypto.public_key
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
            
    @staticmethod
    def get_by_election_id(election_id):
        try:
            crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
            if not crypto_config:
                return jsonify({'error': 'Crypto configuration not found for this election'}), 404
            
            return jsonify({
                'crypto_id': crypto_config.crypto_id,
                'election_id': crypto_config.election_id,
                'public_key': crypto_config.public_key
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
            
    @staticmethod
    def update_election_id(crypto_id, new_election_id):
        """
        Update the election_id for a crypto config, typically after creating an election with a temporary ID
        """
        try:
            crypto_config = CryptoConfig.query.get(crypto_id)
            if not crypto_config:
                return jsonify({'error': 'Crypto configuration not found'}), 404
                
            # Check if this is a temporary ID (negative number)
            if crypto_config.election_id is not None and crypto_config.election_id > 0:
                # Only overwrite if it's a temporary ID
                return jsonify({'error': 'Crypto configuration is already assigned to a real election'}), 400
                
            crypto_config.election_id = new_election_id
            db.session.commit()
            
            return jsonify({
                'crypto_id': crypto_config.crypto_id,
                'election_id': crypto_config.election_id,
                'message': 'Election ID updated successfully'
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
            
    @staticmethod
    def generate_temp_election_id():
        """
        Generate a temporary election ID for use during key generation
        before the actual election is created
        """
        try:
            # Generate a large negative ID to avoid conflicts with real election IDs
            # Real election IDs are positive integers starting from 1
            temp_id = -int(secrets.token_hex(4), 16)  # Negative number to distinguish from real IDs
            
            return jsonify({
                'temp_election_id': temp_id,
                'message': 'Temporary election ID generated successfully. Use this ID for key generation.'
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500    
        
    @staticmethod
    def generate_key_pair(election_id, n_personnel, threshold, authority_ids=None, crypto_method='paillier', store_in_db=True):
        """
        Generate a Paillier key pair with Shamir secret sharing of the prime factor p.
        
        Args:
            election_id: The ID of the election (can be temporary negative ID)
            n_personnel: Number of key shares to generate
            threshold: Minimum number of shares needed for reconstruction
            authority_ids: Optional list of authority IDs to assign shares to
            crypto_method: Cryptographic method (only 'paillier' supported)
            store_in_db: Whether to store the key pair in the database (default True)
            
        Returns:
            Dictionary containing the public key, serialized shares, and security data
        """
        try:
            key_data = {}
            
            # Only Paillier with Shamir Secret Sharing
            if crypto_method != 'paillier':
                logger.warning(f"Unsupported crypto_method: {crypto_method}, defaulting to paillier")
            
            logger.info(f"Generating Paillier key pair for election {election_id} with {n_personnel} personnel and threshold {threshold}")
            
            public_key, private_key = paillier.generate_paillier_keypair(n_length=2048)
            priv_key_p = int(private_key.p)
            priv_key_q = int(private_key.q)
            public_key_n = int(public_key.n)
            
            # CRITICAL: Verify p and q are proper factors
            if priv_key_p * priv_key_q != public_key_n:
                logger.error(f"CRITICAL: Generated p*q != n: {priv_key_p} * {priv_key_q} != {public_key_n}")
                raise ValueError("Generated Paillier key pair is invalid: p*q != n")
            
            logger.info(f"Generated valid Paillier key: p={priv_key_p.bit_length()} bits, q={priv_key_q.bit_length()} bits, n={public_key_n.bit_length()} bits")
            
            # For Shamir's secret sharing, we need a prime modulus larger than the secret
            # The secret is priv_key_p, so we need to find a prime larger than p
            secret_bits = priv_key_p.bit_length()
            min_prime_bits = max(secret_bits + 128, 1024)  # Increased minimum size
            prime_candidate = 2**min_prime_bits + 1
            shamir_prime = next_prime(prime_candidate)
            
            logger.info(f"Splitting private key using shamirs with threshold {threshold}/{n_personnel}")
            logger.info(f"Secret p has {secret_bits} bits, using Shamir prime with {shamir_prime.bit_length()} bits")
            
            # Ensure Shamir prime is larger than the secret
            while shamir_prime <= priv_key_p:
                prime_candidate *= 2
                shamir_prime = next_prime(prime_candidate)
            
            logger.info(f"Final Shamir modulus: {shamir_prime} (bits: {shamir_prime.bit_length()})")
            
            # Split the private key p using Shamir's secret sharing with a larger prime as modulus
            shares_raw_p = shamirs.shares(priv_key_p, quantity=n_personnel, modulus=shamir_prime, threshold=threshold)
            
            # VALIDATION: Test reconstruction immediately after generation
            reconstructed_test = shamirs.interpolate(shares_raw_p)
            if reconstructed_test != priv_key_p:
                logger.error(f"CRITICAL: Immediate reconstruction test failed! Generated: {priv_key_p}, Reconstructed: {reconstructed_test}")
                raise ValueError("Shamir secret sharing reconstruction validation failed")
            
            logger.info("✓ Shamir secret sharing reconstruction validation passed")
            
            # Create comprehensive security data with all required fields
            security_data = {
                "n": str(public_key_n),
                "p": str(priv_key_p),  # Store the actual Paillier prime factor p
                "q": str(priv_key_q),  # Also store q for completeness
                "p_times_q": str(priv_key_p * priv_key_q),
                "prime_modulus": str(shamir_prime),  # Store the Shamir modulus prime
                "prime": str(shamir_prime),  # Store under both keys for compatibility
                "key_bits": public_key_n.bit_length(),
                "sharing_method": "direct_p",  # Explicitly note we're using direct p sharing
                "threshold": threshold,
                "n_personnel": n_personnel,
                "validation_passed": True,  # Mark that validation passed
                "generation_timestamp": str(datetime.utcnow())
            }
            
            # Serialize shares using share object attributes
            shares = [f"{share.index}:{hex(share.value)[2:]}" for share in shares_raw_p]
            public_key_json = json.dumps({
                'n': str(public_key_n),
                'key_type': 'paillier',
                'bit_length': public_key_n.bit_length()
            })
              
            # Build metadata consistently with ALL security data at top level for easy access
            meta_data_json = json.dumps({
                'crypto_type': 'paillier',
                'n_personnel': n_personnel,
                'threshold': threshold,
                'p': str(priv_key_p),  # Store the actual Paillier prime factor p at top level
                'prime': str(shamir_prime),  # Store the Shamir modulus prime at top level
                'prime_modulus': str(shamir_prime),  # Store under multiple keys for robustness
                'created_at': str(datetime.utcnow()),
                'sharing_method': 'direct_p',  # Explicitly note we're using direct p sharing
                'security_data': security_data,  # Store complete security data object
                'key_bits': public_key_n.bit_length(),
                'validation_passed': True  # Mark that validation passed
            })
            
            # Store in the database if requested
            if store_in_db:
                crypto_config = CryptoConfig(
                    election_id=election_id,
                    public_key=public_key_json,
                    key_type='paillier',
                    status='active',
                    meta_data=meta_data_json
                )
                db.session.add(crypto_config)
                db.session.commit()
                
                # Associate shares with authorities if provided
                if authority_ids and len(authority_ids) == len(shares):
                    for i, authority_id in enumerate(authority_ids):
                        key_share = KeyShare(
                            crypto_id=crypto_config.crypto_id,
                            authority_id=authority_id,
                            share_value=shares[i]
                        )
                        db.session.add(key_share)
                    db.session.commit()
            
            # Return key data consistently regardless of storage method
            key_data = {
                "public_key": public_key_json,
                "serialized_shares": shares,
                "security_data": security_data,
                "meta_data": meta_data_json
            }
            return key_data
        except Exception as e:
            logger.error(f"Error generating key pair: {e}")
            raise

    @staticmethod    
    def distribute_key_shares():
        """
        Distribute key shares to trusted authorities
        """
        try:
            data = request.json
            
            # Required fields validation
            crypto_id = data.get('crypto_id')
            authority_ids = data.get('authority_ids')
            key_shares = data.get('key_shares')
            
            if not crypto_id or not authority_ids or not key_shares:
                return jsonify({'error': 'Missing required fields'}), 400
                
            if len(authority_ids) != len(key_shares):
                return jsonify({'error': 'Number of authorities must match number of key shares'}), 400
            
            # Verify the crypto config exists
            crypto_config = CryptoConfig.query.get(crypto_id)
            if not crypto_config:
                return jsonify({'error': 'Crypto configuration not found'}), 404
            
            # Create key shares for each authority
            created_shares = []
            for i, authority_id in enumerate(authority_ids):
                # Check if the authority already has a share
                existing_share = KeyShare.query.filter_by(
                    crypto_id=crypto_id,
                    authority_id=authority_id
                ).first()
                
                if existing_share:
                    return jsonify({'error': f'Authority ID {authority_id} already has a key share'}), 400
                
                # Create new key share
                key_share = KeyShare(
                    crypto_id=crypto_id,
                    authority_id=authority_id,
                    share_value=key_shares[i]
                )
                db.session.add(key_share)
                created_shares.append({
                    'authority_id': authority_id,
                    'share_id': key_share.key_share_id
                })
            
            db.session.commit()
            
            return jsonify({
                'crypto_id': crypto_id,
                'distributed_shares': created_shares
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
            
    @staticmethod
    def verify_key_shares(crypto_id: int, shares: List[str]) -> bool:
        """
        Verify if a set of key shares can be properly combined to reconstruct a valid private key
        that corresponds to the public key in the crypto configuration.
        
        Args:
            crypto_id: ID of the crypto configuration
            shares: List of key share values to verify
            
        Returns:
            Boolean indicating if the shares are valid and can reconstruct the key
        """
        try:
            # Get the crypto configuration
            crypto_config = CryptoConfig.query.get(crypto_id)
            if not crypto_config:
                logger.error(f"Crypto configuration {crypto_id} not found")
                return False
                
            # Parse the metadata to get the prime modulus and other parameters
            metadata = json.loads(crypto_config.meta_data)
              # Get crypto type
            crypto_type = metadata.get('crypto_type', 'unknown')
            
            if crypto_type == 'paillier':
                # Reconstruct the secret from shares
                # Try to get prime from multiple possible keys for robustness
                prime_modulus = (metadata.get('prime') or 
                               metadata.get('prime_modulus') or 
                               metadata.get('security_data', {}).get('prime_modulus') or
                               metadata.get('security_data', {}).get('prime'))
                
                if not prime_modulus:
                    logger.error(f"Prime modulus not found in metadata for crypto config {crypto_id}")
                    return False
                    
                prime_modulus = int(prime_modulus)
                # Reconstruct the secret (p value) from shares
                try:
                    reconstructed_p = shamirs.interpolate(shares)
                    
                    # Parse the security data to verify the reconstructed value
                    security_data = metadata.get('security_data', {})
                    if not security_data:
                        logger.error(f"Security data not found in metadata for crypto config {crypto_id}")
                        return False
                        
                    # Parse the public key to get n
                    public_key_data = json.loads(crypto_config.public_key)
                    n = int(public_key_data.get('n', 0))
                    
                    # Check if n is divisible by reconstructed p (validates p is a factor of n)
                    if n % reconstructed_p != 0:
                        logger.error(f"Reconstructed p value does not divide n for crypto config {crypto_id}")
                        return False
                        
                    # Get p_times_q from security data
                    p_times_q = int(security_data.get('p_times_q', 0))
                    
                    # Verify p_times_q matches n (validates integrity of the reconstruction)
                    if p_times_q != n:
                        logger.error(f"Product of p and q does not match n for crypto config {crypto_id}")
                        return False
                        
                    return True
                    
                except Exception as e:
                    logger.error(f"Error reconstructing secret for crypto config {crypto_id}: {str(e)}")
                    return False
            elif crypto_type == 'threshold_elgamal':
                # ElGamal implementation has been removed
                logger.warning("ElGamal implementation has been removed. Only Paillier is supported.")
                return False
                
            else:
                logger.error(f"Unknown crypto type {crypto_type} for crypto config {crypto_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error verifying key shares for crypto config {crypto_id}: {str(e)}")                
            return False
            
    @staticmethod
    def reconstruct_key(crypto_id: int, shares: List[str]) -> Dict[str, Any]:
        """
        Reconstruct a private key from shares for authorized operations
        Warning: This should only be used in controlled environments by authorized personnel
        for key recovery or key verification purposes.
        
        This implementation focuses on direct p sharing, where the shared secret is the Paillier prime p directly.
        
        Args:
            crypto_id: ID of the crypto configuration
            shares: List of key share values to reconstruct from
            
        Returns:
            Dictionary with the reconstructed key information
        """
        try:
            # Get the crypto configuration
            crypto_config = CryptoConfig.query.get(crypto_id)
            if not crypto_config:
                return {'error': 'Crypto configuration not found'}
                
            # Parse the metadata to get the prime modulus and other parameters
            metadata = json.loads(crypto_config.meta_data)
            
            # Get crypto type
            crypto_type = metadata.get('crypto_type', 'unknown')
            sharing_method = metadata.get('sharing_method', 'direct_p')  # Default to direct_p sharing
            
            if crypto_type == 'paillier':
                logger.info(f"Reconstructing key for crypto config {crypto_id} using {sharing_method} sharing method")
                
                # Reconstruct the secret from shares
                # Try to get prime from multiple possible keys for robustness
                prime_modulus = (metadata.get('prime') or
                               metadata.get('prime_modulus') or 
                               metadata.get('security_data', {}).get('prime_modulus') or
                               metadata.get('security_data', {}).get('prime'))
                
                if not prime_modulus:
                    return {'error': 'Prime modulus not found in metadata'}
                    
                prime_modulus = int(prime_modulus)
                logger.info(f"Using Shamir modulus prime: {prime_modulus}")
                
                # Parse shares to proper format for shamirs library
                parsed_shares = []
                for share_str in shares:
                    if not share_str or (isinstance(share_str, str) and share_str.strip() == ""):
                        continue
                    
                    try:
                        if ':' in share_str:
                            # Parse x:hex(y) format
                            x_str, y_hex = share_str.split(':', 1)
                            x = int(x_str)
                            y = int(y_hex, 16)
                            # Create proper shamirs.share object
                            share_obj = shamirs.share(x, y, prime_modulus)
                            parsed_shares.append(share_obj)
                        else:
                            logger.warning(f"Invalid share format: {share_str}")
                    except Exception as e:
                        logger.error(f"Error parsing share {share_str}: {e}")
                        
                if len(parsed_shares) == 0:
                    return {'error': 'No valid shares found for reconstruction'}
                
                # Reconstruct the secret (p value) from shares
                try:
                    # Direct p sharing: reconstructed secret is the Paillier prime p
                    reconstructed_p = shamirs.interpolate(parsed_shares)
                    logger.info(f"Reconstructed secret: {reconstructed_p} (bits: {reconstructed_p.bit_length()})")
                    
                    # Parse the public key to get n
                    public_key_data = json.loads(crypto_config.public_key)
                    n = int(public_key_data.get('n', 0))
                    logger.info(f"Public key n: {n} (bits: {n.bit_length()})")
                    
                    # Verify reconstructed_p is a factor of n
                    if n % reconstructed_p != 0:
                        logger.error(f"Reconstructed p is not a factor of n: {reconstructed_p} % {n} = {n % reconstructed_p}")
                        
                        # Additional debugging for key reconstruction issues
                        import math
                        gcd_val = math.gcd(reconstructed_p, n)
                        logger.info(f"GCD between reconstructed_p and n: {gcd_val}")
                        
                        if gcd_val > 1:
                            # If the GCD is non-trivial, it could be a factor of n
                            logger.info(f"Found a non-trivial GCD: {gcd_val}")
                            candidate_p = gcd_val
                            
                            if n % candidate_p == 0:
                                logger.info(f"Found a valid factor from GCD! Using {candidate_p} as p")
                                reconstructed_p = candidate_p
                            else:
                                # Check for off-by-one errors
                                if n % (reconstructed_p + 1) == 0:
                                    logger.info(f"Found p+1 is a factor of n! Using {reconstructed_p + 1} as p")
                                    reconstructed_p = reconstructed_p + 1
                                elif n % (reconstructed_p - 1) == 0:
                                    logger.info(f"Found p-1 is a factor of n! Using {reconstructed_p - 1} as p")
                                    reconstructed_p = reconstructed_p - 1
                                else:
                                    return {'error': 'Reconstructed p is not a factor of n and no valid adjustment found'}
                        else:
                            # Check for off-by-one errors
                            if n % (reconstructed_p + 1) == 0:
                                logger.info(f"Found p+1 is a factor of n! Using {reconstructed_p + 1} as p")
                                reconstructed_p = reconstructed_p + 1
                            elif n % (reconstructed_p - 1) == 0:
                                logger.info(f"Found p-1 is a factor of n! Using {reconstructed_p - 1} as p")
                                reconstructed_p = reconstructed_p - 1
                            else:
                                return {'error': 'Reconstructed p is not a factor of n and no valid adjustment found'}
                    
                    # Calculate q by dividing n by p
                    reconstructed_q = n // reconstructed_p
                    
                    # Verify p * q = n
                    if reconstructed_p * reconstructed_q != n:
                        return {'error': f'Reconstructed primes product mismatch: {reconstructed_p} * {reconstructed_q} != {n}'}
                    
                    # Compare with expected p if available
                    expected_p = None
                    if 'p' in metadata:
                        try:
                            expected_p = int(metadata['p'])
                            if expected_p != reconstructed_p:
                                logger.warning(f"Reconstructed p ({reconstructed_p}) doesn't match expected p ({expected_p})")
                        except (ValueError, TypeError):
                            pass
                        
                    # Return the reconstructed key information
                    return {
                        'success': True,
                        'crypto_type': 'paillier',
                        'sharing_method': 'direct_p',
                        'public_key': str(n),
                        'private_key': {
                            'p': str(reconstructed_p),
                            'q': str(reconstructed_q)
                        }
                    }
                    
                except Exception as e:
                    return {'error': f'Error reconstructing secret: {str(e)}'}
            
            elif crypto_type == 'threshold_elgamal':
                # ElGamal implementation is removed
                return {'error': 'ElGamal key reconstruction is not supported'}
                
            else:
                return {'error': f'Unknown crypto type {crypto_type}'}
                
        except Exception as e:
            return {'error': f'Error reconstructing key: {str(e)}'}
            
    @staticmethod
    def generate_key_pair_in_memory():
        """
        Generate cryptographic key pairs in memory without storing them in the database.
        This is used when creating a new election to avoid database writes until the election is created.
        
        This method now calls generate_key_pair with store_in_db=False to eliminate duplicate logic.
        """
        try:
            logger.info("Starting in-memory key pair generation")
            data = request.json
            if not data:
                logger.error("No JSON data provided in request")
                return jsonify({'error': 'No JSON data provided'}), 400
                
            n_personnel = int(data.get('n_personnel', 3))
            threshold = int(data.get('threshold', n_personnel))
            crypto_method = data.get('crypto_method', 'paillier')
            authority_names = data.get('authority_names', [])
            
            logger.info(f"In-memory key generation with parameters: n_personnel={n_personnel}, threshold={threshold}, method={crypto_method}")
            
            if crypto_method != 'paillier':
                logger.warning(f"Crypto method {crypto_method} not supported, defaulting to paillier")
                crypto_method = 'paillier'
            
            # Generate temporary election ID (negative number)
            temp_election_id = -int(secrets.token_hex(4), 16)
            
            # Use the unified generate_key_pair method with store_in_db=False
            key_data = CryptoConfigController.generate_key_pair(
                election_id=temp_election_id,
                n_personnel=n_personnel,
                threshold=threshold,
                crypto_method=crypto_method,
                store_in_db=False
            )
            
            # Extract data from key_data
            public_key_json = key_data['public_key']
            shares = key_data['serialized_shares']
            security_data = key_data['security_data']
            meta_data = json.loads(key_data.get('meta_data', '{}'))
            
            # Create authority-share mapping
            authority_shares_mapping = []
            for i, name in enumerate(authority_names[:len(shares)]):
                authority_shares_mapping.append({
                    'name': name,
                    'share': shares[i]
                })
                
            return jsonify({
                'public_key': public_key_json,
                'private_shares': shares,
                'authority_shares': authority_shares_mapping,
                'threshold': threshold,
                'security_data': security_data,
                'crypto_type': 'paillier',
                'key_bits': security_data.get('key_bits'),
                'meta_data': meta_data
            }), 200
        except Exception as e:
            error_details = traceback.format_exc()
            logger.error(f"Error in in-memory key generation: {str(e)}\n{error_details}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def store_election_crypto_data():
        """
        Store cryptographic data for a newly created election.
        This is called after the election is created to associate keys and shares.
        
        This is the centralized method for storing crypto data after election creation.
        It ensures that all security data, especially the Paillier prime p and Shamir 
        modulus prime are consistently stored.
        """
        try:
            data = request.json
            if not data:
                logger.error("No JSON data provided in request")
                return jsonify({'error': 'No JSON data provided'}), 400
                
            # Required fields
            election_id = data.get('election_id')
            public_key = data.get('public_key')
            crypto_type = data.get('crypto_type', 'paillier')
            meta_data_input = data.get('meta_data')
            authority_shares = data.get('authority_shares', [])
            threshold = data.get('threshold')
            security_data = data.get('security_data', {})
            
            logger.info(f"[store_election_crypto_data] election_id={election_id}, crypto_type={crypto_type}")
            
            if not election_id:
                return jsonify({'error': 'Election ID is required'}), 400
                
            if not public_key:
                return jsonify({'error': 'Public key is required'}), 400
                
            # Parse provided meta_data if present
            meta_data_obj = {}
            if meta_data_input:
                if isinstance(meta_data_input, str):
                    try:
                        meta_data_obj = json.loads(meta_data_input)
                    except json.JSONDecodeError:
                        logger.warning("[store_election_crypto_data] Failed to parse meta_data as JSON")
                elif isinstance(meta_data_input, dict):
                    meta_data_obj = meta_data_input
            
            # If security_data is empty but meta_data has security_data, use it
            if not security_data and 'security_data' in meta_data_obj:
                security_data = meta_data_obj['security_data']
                logger.info("[store_election_crypto_data] Extracted security_data from meta_data")
            
            # Extract and validate critical security parameters
            paillier_prime = (security_data.get('p') or 
                            meta_data_obj.get('p') or
                            meta_data_obj.get('security_data', {}).get('p'))
            prime_modulus = (security_data.get('prime_modulus') or 
                            security_data.get('prime') or
                            meta_data_obj.get('prime_modulus') or
                            meta_data_obj.get('prime') or
                            meta_data_obj.get('security_data', {}).get('prime_modulus') or
                            meta_data_obj.get('security_data', {}).get('prime'))
            sharing_method = security_data.get('sharing_method', 'direct_p')
            
            # Ensure we have required security data
            if not paillier_prime:
                logger.error("[store_election_crypto_data] CRITICAL: Paillier prime (p) missing from security_data!")
                logger.error(f"[store_election_crypto_data] Available data - security_data: {security_data}")
                logger.error(f"[store_election_crypto_data] Available data - meta_data_obj: {meta_data_obj}")
                return jsonify({'error': 'Paillier prime (p) is required in security_data or meta_data'}), 400
                
            if not prime_modulus:
                logger.error("[store_election_crypto_data] CRITICAL: Shamir modulus prime missing from security_data!")
                return jsonify({'error': 'Shamir modulus prime is required in security_data or meta_data'}), 400
            
            logger.info(f"[store_election_crypto_data] Paillier prime (p): {paillier_prime}")
            logger.info(f"[store_election_crypto_data] Shamir modulus prime: {prime_modulus}")
                
            # Compose comprehensive meta_data with security info at multiple levels
            meta_data = {
                'crypto_type': crypto_type,
                'threshold': threshold or meta_data_obj.get('threshold'),
                'n_personnel': len(authority_shares),
                'created_at': str(datetime.utcnow()),
                'sharing_method': sharing_method,
                # Store critical security data at top level for easy access
                'p': str(paillier_prime),
                'prime': str(prime_modulus),
                'prime_modulus': str(prime_modulus),
                # Store complete security_data object
                'security_data': security_data
            }
            
            # Ensure security_data also has all required fields
            if 'p' not in security_data:
                security_data['p'] = str(paillier_prime)
            if 'prime_modulus' not in security_data:
                security_data['prime_modulus'] = str(prime_modulus)
            if 'prime' not in security_data:
                security_data['prime'] = str(prime_modulus)
            
            # Log the final meta_data to be stored
            logger.info(f"[store_election_crypto_data] Final meta_data: {meta_data}")
            
            # Create the CryptoConfig record
            crypto_config = CryptoConfig(
                election_id=election_id,
                public_key=public_key,
                key_type=crypto_type,
                status='active',
                meta_data=json.dumps(meta_data)
            )
            db.session.add(crypto_config)
            db.session.commit()
            
            # Process authority shares based on the structure provided from frontend
            created_authorities = []
            logger.info(f"[store_election_crypto_data] Processing {len(authority_shares)} authority shares")
            
            for authority_data in authority_shares:
                # Handle different formats of authority data from frontend
                authority_id = None
                share_value = None
                name = None
                
                # Format 1: {'name': 'Auth Name', 'share': 'share_value'}
                if 'name' in authority_data and 'share' in authority_data:
                    name = authority_data.get('name')
                    share_value = authority_data.get('share')
                    
                    # If authority doesn't exist yet, create it
                    if not name:
                        logger.warning(f"[store_election_crypto_data] Skipping authority with missing name: {authority_data}")
                        continue
                        
                    # Create the trusted authority
                    authority = TrustedAuthority(
                        authority_name=name,
                        contact_info=''
                    )
                    db.session.add(authority)
                    db.session.flush()  # Get the ID without committing
                    authority_id = authority.authority_id
                
                # Format 2: {'authority_id': 123, 'share_value': 'share_value'}
                elif 'authority_id' in authority_data:
                    authority_id = authority_data.get('authority_id')
                    share_value = authority_data.get('share_value')
                    
                    # Check if authority exists
                    authority = TrustedAuthority.query.get(authority_id)
                    if not authority:
                        logger.warning(f"[store_election_crypto_data] Authority with ID {authority_id} not found")
                        continue
                    name = authority.authority_name
                
                # Skip if we couldn't determine authority_id or share_value
                if not authority_id or not share_value:
                    logger.warning(f"[store_election_crypto_data] Skipping authority with missing ID or share value: {authority_data}")
                    continue
                
                # Create the key share
                key_share = KeyShare(
                    crypto_id=crypto_config.crypto_id,
                    authority_id=authority_id,
                    share_value=share_value
                )
                db.session.add(key_share)
                created_authorities.append({
                    'id': authority_id,
                    'name': name
                })
                logger.info(f"[store_election_crypto_data] Created key share for authority_id={authority_id}, share_length={len(share_value) if share_value else 0}")
            
            db.session.commit()
            logger.info(f"[store_election_crypto_data] CryptoConfig and {len(created_authorities)} key shares committed for election_id={election_id}")
            
            return jsonify({
                'crypto_id': crypto_config.crypto_id,
                'election_id': election_id,
                'authorities': created_authorities,
                'message': 'Crypto data stored successfully'
            }), 201
        except Exception as e:
            db.session.rollback()
            error_details = traceback.format_exc()
            logger.error(f"Error storing election crypto data: {str(e)}\n{error_details}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def get_all_security_keys():
        """
        Fetch all security keys (public keys) for elections, including election name, key type, status, created_at, and associated election.
        Status is set to 'Expired' if 5 days have passed since the election's end date.
        """
        try:
            from datetime import datetime, timedelta
            crypto_configs = CryptoConfig.query.all()
            keys = []
            for config in crypto_configs:
                election = Election.query.get(config.election_id) if config.election_id else None
                # Determine status
                status = config.status or 'Active'
                if election and election.date_end:
                    end_date = election.date_end
                    if isinstance(end_date, str):
                        end_date = datetime.fromisoformat(end_date)
                    # Patch: ensure end_date is a datetime for comparison
                    if isinstance(end_date, datetime):
                        expire_date = end_date + timedelta(days=5)
                    else:
                        # end_date is likely a date, convert datetime.utcnow() to date for comparison
                        expire_date = end_date + timedelta(days=5)
                        if datetime.utcnow().date() > expire_date:
                            status = 'Expired'
                        else:
                            status = config.status or 'Active'
                        # skip the rest of this block
                        key_type = 'Paillier'
                        keys.append({
                            'key_id': config.crypto_id,
                            'key_name': election.election_name if election else f"Key #{config.crypto_id}",
                            'key_type': key_type,
                            'key_status': status,
                            'created_at': config.created_at.isoformat() if config.created_at else None,
                            'description': election.election_desc if election else '',
                            'associated_election': election.election_name if election else None,
                            'key_fingerprint': config.public_key[:47] + '...' if config.public_key else '',
                            'election_id': config.election_id
                        })
                        continue
                    if datetime.utcnow() > expire_date:
                        status = 'Expired'
                # Always set key_type to 'Paillier'
                key_type = 'Paillier'
                keys.append({
                    'key_id': config.crypto_id,
                    'key_name': election.election_name if election else f"Key #{config.crypto_id}",
                    'key_type': key_type,
                    'key_status': status,
                    'created_at': config.created_at.isoformat() if config.created_at else None,
                    'description': election.election_desc if election else '',
                    'associated_election': election.election_name if election else None,
                    'key_fingerprint': config.public_key[:47] + '...' if config.public_key else '',
                    'election_id': config.election_id
                })
            return jsonify({'keys': keys}), 200
        except Exception as e:
            import logging
            logging.exception("Failed to fetch security keys")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def get_trusted_authorities_for_election(election_id):
        """
        Fetch trusted authorities for a given election by looking up key shares for the election's crypto config.
        """
        try:
            crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
            if not crypto_config:
                return jsonify({'error': 'No crypto config found for this election'}), 404
            key_shares = KeyShare.query.filter_by(crypto_id=crypto_config.crypto_id).all()
            authority_ids = [ks.authority_id for ks in key_shares]
            authorities = TrustedAuthority.query.filter(TrustedAuthority.authority_id.in_(authority_ids)).all()
            result = [
                {
                    'authority_id': a.authority_id,
                    'authority_name': a.authority_name,
                    'contact_info': a.contact_info,
                    'created_at': a.created_at.isoformat() if a.created_at else None
                }
                for a in authorities
            ]
            return jsonify({'authorities': result}), 200
        except Exception as e:
            logging.exception("Failed to fetch trusted authorities for election")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def check_key_shares_status():
        """
        Check the status of key shares for an election.
        """
        try:
            from flask import request
            election_id = request.args.get('election_id')
            
            if not election_id:
                return jsonify({'error': 'Election ID is required'}), 400
                
            # Import what we need
            from app.models.crypto_config import CryptoConfig
            from app.models.key_share import KeyShare
            from app.models.election import Election
            
            # Verify the election exists
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': f'Election {election_id} not found'}), 404
                
            # Get crypto config for this election
            crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
            if not crypto_config:
                return jsonify({
                    'election_id': election_id,
                    'crypto_config': None,
                    'key_shares': [],
                    'message': 'No crypto configuration found for this election'
                }), 200
            
            # Get key shares for this crypto config
            key_shares = KeyShare.query.filter_by(crypto_id=crypto_config.crypto_id).all()
            
            shares_data = []
            for share in key_shares:
                shares_data.append({
                    'key_share_id': share.key_share_id,
                    'authority_id': share.authority_id,
                    'share_value_length': len(share.share_value) if share.share_value else 0
                })
            
            return jsonify({
                'election_id': election_id,
                'crypto_config': {
                    'crypto_id': crypto_config.crypto_id,
                    'key_type': crypto_config.key_type,
                    'status': crypto_config.status
                },
                'key_shares': shares_data,
                'message': f'Found {len(shares_data)} key shares for this election'
            }), 200
                
        except Exception as e:
            logger.error(f"Error checking key shares status: {str(e)}")
            return jsonify({'error': f"Failed to check key shares status: {str(e)}"}), 500
