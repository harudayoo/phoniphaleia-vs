from flask import jsonify, request
import json
import logging
import traceback
import sys
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from phe import paillier
import shamirs

# Helper for next_prime if sympy is not available
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

class InMemoryKeyController:      
    @staticmethod
    def generate_paillier_keypair():
        """
        Generate a Paillier keypair without storing it in the database.
        Returns the public key and key shares for distribution using shamirs library.
        Uses direct p sharing method (sharing the Paillier prime factor p directly).
        
        This function uses CryptoConfigController.generate_key_pair with store_in_db=False
        to ensure consistency between in-memory and persistent key generation.
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
            
            if crypto_method != 'paillier':
                return jsonify({'error': f'Crypto method {crypto_method} not supported by this endpoint'}), 400
            
            logger.info(f"Parameters: n_personnel={n_personnel}, threshold={threshold}, method={crypto_method}")
            
            # Use CryptoConfigController.generate_key_pair for the core logic
            # to ensure consistency between in-memory and persistent key generation
            from app.controllers.crypto_config_controller import CryptoConfigController
            import secrets
            
            # Generate temporary election ID (negative number) for reference only
            temp_election_id = -int(secrets.token_hex(4), 16)
            
            # Get key pair data using CryptoConfigController's logic, but don't store in DB
            key_data = CryptoConfigController.generate_key_pair(
                election_id=temp_election_id, 
                n_personnel=n_personnel, 
                threshold=threshold, 
                crypto_method=crypto_method,
                store_in_db=False  # Don't store in database
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
            
            # Return the data in the expected format
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
            logger.error(f"Error generating in-memory keypair: {str(e)}\n{traceback.format_exc()}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def store_crypto_config_with_shares():
        """
        Store crypto configuration and key shares in the database
        after the election has been created.
        """
        try:
            data = request.json
            if not data:
                logger.error("No JSON data provided in request")
                return jsonify({'error': 'No JSON data provided'}), 400
                  
            # Required fields
            election_id = data.get('election_id')
            public_key = data.get('public_key')
            key_type = data.get('key_type', 'paillier')
            meta_data = data.get('meta_data')
            authority_shares = data.get('authority_shares', [])  # List of {authority_id, share_value}
            
            # Handle security_data if it's provided separately
            security_data = data.get('security_data')
            if security_data and isinstance(security_data, dict):
                logger.info("Security data was provided separately, will incorporate into meta_data")
                
            if not election_id or not public_key:
                logger.error("Missing required fields: election_id and public_key")
                return jsonify({'error': 'Election ID and public key are required'}), 400
                
            logger.info(f"Storing crypto config for election {election_id} with {len(authority_shares)} key shares")
            
            # Log received authority shares for debugging (without exposing sensitive data)
            for idx, auth_share in enumerate(authority_shares):
                auth_id = auth_share.get('authority_id')
                share_length = len(auth_share.get('share_value')) if auth_share.get('share_value') else 0
                logger.info(f"Authority Share #{idx}: authority_id={auth_id}, share_value_length={share_length}")
                
            # Import what we need
            from app.models.crypto_config import CryptoConfig
            from app.models.key_share import KeyShare
            from app.models.election import Election
            from app.models.trusted_authority import TrustedAuthority
            from app import db
              
            # Verify the election exists
            election = Election.query.get(election_id)
            if not election:
                logger.error(f"Election {election_id} not found")
                return jsonify({'error': f'Election {election_id} not found'}), 404
                
            # Ensure meta_data has the required security information including prime modulus and Paillier p
            try:
                # Parse meta_data if it's a string, or use it directly if it's already a dict
                meta_obj = json.loads(meta_data) if isinstance(meta_data, str) and meta_data else meta_data or {}
                # Make sure we have a security_data object
                if 'security_data' not in meta_obj:
                    meta_obj['security_data'] = {}
                # If security_data was provided separately, merge it into meta_obj
                if security_data and isinstance(security_data, dict):
                    logger.info("Merging separately provided security_data into meta_data")
                    meta_obj['security_data'].update(security_data)
                
                # Ensure all critical security data is present at both top level and in security_data
                paillier_p = (meta_obj.get('p') or meta_obj.get('security_data', {}).get('p') or (security_data or {}).get('p'))
                prime = (meta_obj.get('prime') or 
                         meta_obj.get('prime_modulus') or 
                         meta_obj.get('security_data', {}).get('prime_modulus') or 
                         meta_obj.get('security_data', {}).get('prime') or
                         (security_data or {}).get('prime_modulus') or
                         (security_data or {}).get('prime'))
                
                if paillier_p:
                    meta_obj['p'] = str(paillier_p)
                    meta_obj['security_data']['p'] = str(paillier_p)
                    logger.info(f"[store_crypto_config_with_shares] Paillier prime (p) stored: {paillier_p}")
                else:
                    logger.warning("[store_crypto_config_with_shares] No Paillier prime (p) found!")
                
                if prime:
                    meta_obj['prime'] = str(prime)
                    meta_obj['prime_modulus'] = str(prime)
                    meta_obj['security_data']['prime_modulus'] = str(prime)
                    meta_obj['security_data']['prime'] = str(prime)
                    logger.info(f"[store_crypto_config_with_shares] Prime modulus stored: {prime}")
                else:
                    # Generate fallback prime if missing
                    try:
                        logger.warning("No prime modulus found, generating fallback")
                        if isinstance(public_key, str) and public_key.startswith('{'):
                            public_key_data = json.loads(public_key)
                            if 'n' in public_key_data:
                                n = int(public_key_data['n'])
                                # Generate a suitable prime modulus
                                bits_needed = max(n.bit_length() // 2 + 128, 1024)
                                import secrets
                                prime_candidate = secrets.randbits(bits_needed) | (1 << (bits_needed - 1)) | 1
                                prime = next_prime(prime_candidate)
                                
                                meta_obj['prime'] = str(prime)
                                meta_obj['prime_modulus'] = str(prime)
                                meta_obj['security_data']['prime_modulus'] = str(prime)
                                meta_obj['security_data']['prime'] = str(prime)
                                logger.info(f"[store_crypto_config_with_shares] Generated fallback prime modulus: {prime}")
                    except Exception as e:
                        logger.error(f"Failed to generate fallback prime modulus: {e}")
                        logger.warning("No prime modulus available - key reconstruction may fail")
                
                # Set crypto_type if missing
                if 'crypto_type' not in meta_obj:
                    meta_obj['crypto_type'] = key_type
                # Add timestamp if missing
                if 'creation_timestamp' not in meta_obj:
                    meta_obj['creation_timestamp'] = datetime.utcnow().isoformat()
                # Log the final meta_data to be stored
                logger.info(f"[store_crypto_config_with_shares] Final meta_data: {meta_obj}")
                # Convert back to JSON string
                meta_data = json.dumps(meta_obj)
                logger.info("Successfully prepared meta_data with security information")
            except Exception as e:
                logger.error(f"Failed to ensure security data in meta_data: {str(e)}")
                logger.error(traceback.format_exc())
            
            # Create the crypto config
            try:
                crypto_config = CryptoConfig(
                    election_id=election_id,
                    public_key=public_key,
                    key_type=key_type,
                    status='active',
                    meta_data=meta_data
                )
                
                from app import db
                db.session.add(crypto_config)
                db.session.flush()  # Get ID without committing
                logger.info(f"Created crypto config with ID: {crypto_config.crypto_id}")
                
                # Process authority shares
                created_shares = []
                for idx, auth_share in enumerate(authority_shares):
                    try:
                        authority_id = auth_share.get('authority_id')
                        share_value = auth_share.get('share_value')
                        
                        if not authority_id or not share_value:
                            logger.warning(f"Skipping invalid authority share #{idx}: Missing required fields")
                            continue
                        
                        # Create new key share
                        key_share = KeyShare(
                            crypto_id=crypto_config.crypto_id,
                            authority_id=authority_id,
                            share_value=share_value
                        )
                        
                        db.session.add(key_share)
                        created_shares.append({
                            'authority_id': authority_id,
                            'crypto_id': crypto_config.crypto_id
                        })
                        
                    except Exception as share_error:
                        logger.error(f"Error processing share #{idx}: {str(share_error)}")
                        continue
                
                # Commit the transaction
                db.session.commit()
                logger.info(f"Successfully stored crypto config with {len(created_shares)} key shares")
                
                return jsonify({
                    'crypto_id': crypto_config.crypto_id,
                    'election_id': election_id,
                    'key_shares': created_shares,
                    'message': 'Crypto configuration and shares stored successfully'
                }), 201
                
            except Exception as commit_error:
                logger.error(f"Error committing transaction: {str(commit_error)}")
                db.session.rollback()
                return jsonify({'error': f'Failed to store crypto configuration: {str(commit_error)}'}), 500
                
        except Exception as e:
            logger.error(f"Error storing crypto config: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': f"Failed to store crypto configuration: {str(e)}"}), 500

    @staticmethod
    def check_key_shares_status():
        """
        Check the status of key shares for an election.
        """
        try:
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
