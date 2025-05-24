# Fixed implementation for ElectionResultsController to support both old and new approaches
# Add this file to a location of your choice in the codebase, then implement its changes

"""
Important changes:
1. reconstruct_private_key method now supports both approaches:
   - New configuration: Direct p sharing - tries first
   - Old configuration: phi(n)/lambda(n) sharing - tries if the new approach fails

2. decrypt_tally method handles private keys from both configurations

These changes ensure that key shares from elections that used the old configuration
(like election ID 46) can still be reconstructed and used for decryption.
"""

import math  # Make sure to import math for the quadratic formula

def reconstruct_private_key_fixed(self):
    """
    Reconstruct the private key from key shares using Shamir Secret Sharing with shamirs library.
    Supports both configurations:
    1. New configuration: reconstructing Paillier prime p directly
    2. Old configuration: reconstructing phi(n) or lambda(n), then deriving p and q
    """
    try:
        data = request.get_json()
        election_id = data.get('election_id')
        shares = data.get('shares')
        if not election_id or not shares:
            return jsonify({'error': 'Missing election_id or shares'}), 400
        crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
        if not crypto_config:
            return jsonify({'error': 'Crypto config not found'}), 404
        meta = crypto_config.meta_data
        if not meta:
            return jsonify({'error': 'No meta_data found in crypto config'}), 500
        meta_json = json.loads(meta)
        # Get the Shamir modulus prime (used for reconstruction)
        shamir_prime = None
        for key in ['prime_modulus', 'prime', 'prime_mod', 'modulus']:
            if key in meta_json and meta_json[key]:
                try:
                    shamir_prime = int(meta_json[key])
                    logger.info(f"Found Shamir modulus in meta_data.{key}: {shamir_prime}")
                    break
                except (ValueError, TypeError):
                    logger.warning(f"Invalid Shamir modulus format in meta_data.{key}")
        if not shamir_prime and 'security_data' in meta_json and meta_json['security_data']:
            security_data = meta_json['security_data']
            for key in ['prime_modulus', 'prime', 'modulus']:
                if key in security_data and security_data[key]:
                    try:
                        shamir_prime = int(security_data[key])
                        logger.info(f"Found Shamir modulus in meta_data.security_data.{key}: {shamir_prime}")
                        break
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid Shamir modulus format in security_data.{key}")
        if not shamir_prime:
            logger.error(f"Shamir modulus not found in meta_data: {meta}")
            return jsonify({'error': 'Shamir modulus not found in meta_data. Cannot reconstruct private key.'}), 500
        # Get expected Paillier prime p for validation
        expected_p = None
        if 'p' in meta_json and meta_json['p']:
            try:
                expected_p = int(meta_json['p'])
                logger.info(f"Found expected Paillier prime p in meta_data: {expected_p}")
            except (ValueError, TypeError):
                logger.warning("Invalid expected prime p format in meta_data")
        if not expected_p and 'security_data' in meta_json and meta_json['security_data']:
            security_data = meta_json['security_data']
            if 'p' in security_data and security_data['p']:
                try:
                    expected_p = int(security_data['p'])
                    logger.info(f"Found expected Paillier prime p in security_data: {expected_p}")
                except (ValueError, TypeError):
                    logger.warning("Invalid expected prime p format in security_data")
        # Parse shares to proper format for shamirs library
        parsed_shares = []
        logger.info(f"Received shares: {shares}")
        for s in shares:
            logger.info(f"Processing share: {s}")
            if not s or (isinstance(s, str) and s.strip() == ""):
                continue
            try:
                if isinstance(s, str):
                    if ':' in s:
                        try:
                            x_str, y_hex = s.split(':', 1)
                            x = int(x_str)
                            y = int(y_hex, 16)
                            share_obj = shamirs.share(x, y, shamir_prime)
                            parsed_shares.append(share_obj)
                            continue
                        except Exception as e:
                            logger.warning(f"Failed to parse share as x:hex(y): {e}")
                    # Try parsing as JSON format like "(x, y)"
                    try:
                        share_data = json.loads(s)
                        if isinstance(share_data, list) and len(share_data) == 2:
                            share_obj = shamirs.share(int(share_data[0]), int(share_data[1]), shamir_prime)
                            parsed_shares.append(share_obj)
                            continue
                    except Exception as e:
                        logger.warning(f"Failed to parse share as JSON: {e}")
                    # Try parsing as simple tuple-like string
                    try:
                        if s.startswith('(') and s.endswith(')'):
                            s_clean = s.strip('()')
                            parts = [p.strip() for p in s_clean.split(',')]
                            if len(parts) == 2:
                                share_obj = shamirs.share(int(parts[0]), int(parts[1]), shamir_prime)
                                parsed_shares.append(share_obj)
                                continue
                    except Exception as e:
                        logger.warning(f"Failed to parse share as tuple string: {e}")
                    logger.error(f"Could not parse share in any recognized format: {s}")
                    return jsonify({'error': f'Invalid share format in: {s}'}), 400
                elif isinstance(s, (list, tuple)) and len(s) == 2:
                    share_obj = shamirs.share(int(s[0]), int(s[1]), shamir_prime)
                    parsed_shares.append(share_obj)
                else:
                    logger.error(f"Invalid share type: {type(s)}, value: {s}")
                    return jsonify({'error': f'Invalid share format: {s}'}), 400
            except Exception as e:
                logger.error(f"Error parsing share {s}: {str(e)}")
                return jsonify({'error': f'Error parsing share: {str(e)}'}), 400
        if not parsed_shares:
            logger.error("No valid shares were parsed")
            return jsonify({'error': 'No valid shares could be parsed from the input'}), 400
        logger.info(f"Successfully parsed {len(parsed_shares)} shares as shamirs.share objects")
        
        # Get public key n for validation
        public_key_n = None
        try:
            public_key_data = json.loads(crypto_config.public_key)
            public_key_n = int(public_key_data.get('n'))
            logger.info(f"Found public key n: {public_key_n}")
        except Exception as e:
            logger.error(f"Could not get public key n: {e}")
            return jsonify({'error': 'Could not retrieve public key n for validation'}), 500
        
        # Use shamirs library to reconstruct the secret
        try:
            reconstructed_secret = shamirs.interpolate(parsed_shares)
            logger.info(f"Reconstructed secret: {reconstructed_secret} (bits: {reconstructed_secret.bit_length()})")
            
            # APPROACH 1: Try new approach (direct p sharing)
            # Validate reconstructed_secret is a factor of n (it's directly p)
            if public_key_n % reconstructed_secret == 0:
                logger.info("New approach successful: reconstructed_secret is a factor of n (directly p)")
                reconstructed_p = reconstructed_secret
                reconstructed_q = public_key_n // reconstructed_p
                
                if reconstructed_p * reconstructed_q != public_key_n:
                    logger.error(f"Reconstructed primes don't match: {reconstructed_p} * {reconstructed_q} != {public_key_n}")
                    return jsonify({'error': f"Reconstructed primes don't match: {reconstructed_p} * {reconstructed_q} != {public_key_n}"}), 500
                
                # Validate against expected p if available
                if expected_p is not None and reconstructed_p != expected_p:
                    logger.warning(f"Reconstructed p ({reconstructed_p}) does not match expected p ({expected_p})")
                    
                # Return the reconstructed prime p
                private_key_data = {
                    'type': 'prime',
                    'p': reconstructed_p,
                    'config_type': 'new_prime'
                }
                private_key_b64 = base64.b64encode(json.dumps(private_key_data).encode()).decode()
                return jsonify({'private_key': private_key_b64, 'config_type': 'new_prime'}), 200
            
            # APPROACH 2: Try old approach (phi(n) or lambda(n) sharing)
            logger.info("New approach failed, trying old approach (phi/lambda sharing)")
            # Assume the reconstructed_secret is phi(n) = (p-1)(q-1) = n - (p+q) + 1
            # Thus p+q = n - phi(n) + 1
            
            # Calculate sum of primes from phi(n)
            sum_pq = public_key_n - reconstructed_secret + 1
            
            # Use quadratic formula to find p and q: x^2 - (p+q)x + pq = 0
            # p,q = (p+q)/2 ± sqrt((p+q)^2 - 4pq)/2
            discriminant = sum_pq**2 - 4*public_key_n
            
            if discriminant < 0:
                logger.error(f"Discriminant is negative: {discriminant}. Old approach failed.")
                return jsonify({'error': 'Failed to reconstruct private key: both approaches failed'}), 500
            
            # Try to get square root of discriminant
            try:
                sqrt_disc = math.isqrt(discriminant)
                
                # Calculate potential p and q
                p_candidate1 = (sum_pq + sqrt_disc) // 2
                p_candidate2 = (sum_pq - sqrt_disc) // 2
                
                # Check which candidate works (if any)
                for p_candidate in [p_candidate1, p_candidate2]:
                    if p_candidate <= 0:
                        continue
                        
                    if public_key_n % p_candidate == 0:
                        q_candidate = public_key_n // p_candidate
                        
                        if p_candidate * q_candidate == public_key_n:
                            logger.info(f"Old approach successful: found p={p_candidate} ({p_candidate.bit_length()} bits) "
                                       f"and q={q_candidate} ({q_candidate.bit_length()} bits)")
                            
                            # Return the reconstructed prime p
                            private_key_data = {
                                'type': 'prime',
                                'p': p_candidate,
                                'config_type': 'old_phi_n'
                            }
                            private_key_b64 = base64.b64encode(json.dumps(private_key_data).encode()).decode()
                            return jsonify({'private_key': private_key_b64, 'config_type': 'old_phi_n'}), 200
            
                # If we get here, the quadratic formula approach failed
                logger.error("Old approach quadratic formula failed to find valid p and q")
                
                # Try alternative approach: GCD method for lambda(n)
                logger.info("Trying GCD method for lambda(n)")
                gcd_val = math.gcd(reconstructed_secret, public_key_n)
                if gcd_val > 1:
                    p_candidate = gcd_val + 1
                    if public_key_n % p_candidate == 0:
                        q_candidate = public_key_n // p_candidate
                        if p_candidate * q_candidate == public_key_n:
                            logger.info(f"Old approach (GCD) successful: found p={p_candidate} ({p_candidate.bit_length()} bits) "
                                      f"and q={q_candidate} ({q_candidate.bit_length()} bits)")
                            
                            # Return the reconstructed prime p
                            private_key_data = {
                                'type': 'prime',
                                'p': p_candidate,
                                'config_type': 'old_lambda_n_gcd'
                            }
                            private_key_b64 = base64.b64encode(json.dumps(private_key_data).encode()).decode()
                            return jsonify({'private_key': private_key_b64, 'config_type': 'old_lambda_n_gcd'}), 200
                
            except Exception as e:
                logger.error(f"Error in old approach: {str(e)}")
            
            # If we reach here, both approaches failed
            logger.error("Both approaches failed to reconstruct a valid private key")
            return jsonify({'error': 'Failed to reconstruct private key: both new and old approaches failed'}), 500
            
        except Exception as interpolation_error:
            logger.error(f"Error during shamirs interpolation: {str(interpolation_error)}")
            return jsonify({'error': f'Failed to reconstruct private key: {str(interpolation_error)}'}), 500
    except Exception as e:
        logger.error(f"Error reconstructing private key: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

def decrypt_tally_fixed(self):
    """
    Decrypt the encrypted tally using the constructed private key.
    After decryption, store the vote counts in the election_results table.
    Uses only homomorphic encryption to count votes.
    Supports both configurations:
    1. New configuration: Reconstructed Paillier prime p
    2. Old configuration: Derived p from phi(n) or lambda(n)
    """
    try:
        data = request.get_json()
        election_id = data.get('election_id')
        private_key_b64 = data.get('private_key')
        if not election_id or not private_key_b64:
            return jsonify({'error': 'Missing election_id or private_key'}), 400
        crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
        if not crypto_config:
            return jsonify({'error': 'Crypto config not found'}), 404
        results = ElectionResult.query.filter_by(election_id=election_id).all()
        try:
            private_key_data = json.loads(base64.b64decode(private_key_b64).decode())
            if private_key_data.get('type') == 'prime':
                # Both new and old approaches use the same type 'prime'
                # as we always derive p (and q) in the end
                reconstructed_p = int(private_key_data['p'])
                public_key_data = json.loads(crypto_config.public_key)
                n = int(public_key_data.get('n'))
                if n % reconstructed_p != 0:
                    logger.error(f"Reconstructed p does not divide n. p={reconstructed_p}, n={n}")
                    return jsonify({'error': f'Reconstructed p does not divide n. p={reconstructed_p}, n={n}'}), 400
                reconstructed_q = n // reconstructed_p
                if reconstructed_p * reconstructed_q != n:
                    logger.error(f"Reconstructed primes don't match: {reconstructed_p} * {reconstructed_q} != {n}")
                    return jsonify({'error': f"Reconstructed primes don't match: {reconstructed_p} * {reconstructed_q} != {n}"}), 400
                
                # Log which configuration was used to derive the private key
                config_type = private_key_data.get('config_type', 'unknown')
                logger.info(f"Using private key from configuration type: {config_type}")
                
                pubkey = paillier.PaillierPublicKey(n=n)
                privkey = paillier.PaillierPrivateKey(pubkey, reconstructed_p, reconstructed_q)
                logger.info(f"Successfully reconstructed private key with p={reconstructed_p.bit_length()} bits "
                           f"and q={reconstructed_q.bit_length()} bits")
                
                decrypted = {}
                for r in results:
                    if r.encrypted_vote_total:
                        try:
                            enc_num = paillier.EncryptedNumber(pubkey, int(r.encrypted_vote_total), 0)
                            vote_count = privkey.decrypt(enc_num)
                            r.vote_count = vote_count
                            decrypted[r.candidate_id] = vote_count
                        except Exception as e:
                            logger.error(f"Error decrypting result for candidate {r.candidate_id}: {e}")
                            return jsonify({'error': f'Decryption failed for candidate {r.candidate_id}: {str(e)}'}), 500
                db.session.commit()
                return jsonify({'decrypted_results': decrypted}), 200
            else:
                logger.error(f"Unsupported private key type: {private_key_data.get('type')}. Only type=prime is supported.")
                return jsonify({'error': 'Only private keys of type "prime" are supported for decryption.'}), 400
        except json.JSONDecodeError:
            logger.error("Failed to decode private key JSON.")
            return jsonify({'error': 'Failed to decode private key JSON.'}), 400
        except Exception as e:
            logger.error(f"Failed to decode private key in any format: {e}")
            return jsonify({'error': f'Failed to decode private key: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in decrypt_tally: {str(e)}")
        return jsonify({'error': str(e)}), 500
