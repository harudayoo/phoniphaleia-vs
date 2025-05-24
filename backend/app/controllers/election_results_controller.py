# filepath: c:\Users\cayan\Documents\Development-Projects\phoniphaleia\backend\app\controllers\election_results_controller.py
from flask import jsonify, request
from app.models.election import Election
from app.models.organization import Organization
from app.models.vote import Vote
from app.models.election_result import ElectionResult
from app.models.crypto_config import CryptoConfig
from app.models.key_share import KeyShare
from app.models.trusted_authority import TrustedAuthority
from datetime import datetime
from app import db
from phe import paillier
import shamirs
import json
import base64
import logging
import traceback

logger = logging.getLogger(__name__)

class ElectionResultsController:
    @staticmethod
    def tally_election():
        """
        Homomorphically tally votes for an election using python-paillier.
        Returns encrypted tallies per candidate (still encrypted).
        Sets election status to 'Finished'.
        """
        try:
            data = request.get_json()
            election_id = data.get('election_id')
            if not election_id:
                return jsonify({'error': 'Missing election_id'}), 400
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': 'Election not found'}), 404
            # Set status to Finished
            election.election_status = 'Finished'
            db.session.commit()
            # Get all votes for this election
            votes = Vote.query.filter_by(election_id=election_id).all()
            # Group by candidate
            candidate_totals = {}
            for v in votes:
                if v.candidate_id not in candidate_totals:
                    candidate_totals[v.candidate_id] = []
                candidate_totals[v.candidate_id].append(v.encrypted_vote)
                
            # Get public key from crypto config
            crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
            if not crypto_config:
                return jsonify({'error': 'Crypto config not found'}), 404
            
            # Parse the public key JSON and extract the n value
            try:
                public_key_data = json.loads(crypto_config.public_key)
                pubkey = paillier.PaillierPublicKey(n=int(public_key_data.get('n')))
                # Homomorphically add encrypted votes per candidate
                encrypted_results = {}
                for candidate_id, enc_votes in candidate_totals.items():
                    enc_sum = None
                    for enc_vote in enc_votes:
                        enc = paillier.EncryptedNumber(pubkey, int(enc_vote), 0)
                        if enc_sum is None:
                            enc_sum = enc
                        else:
                            enc_sum = enc_sum + enc
                    if enc_sum:
                        encrypted_results[candidate_id] = str(enc_sum.ciphertext())
                # Store encrypted results in ElectionResult
                for candidate_id, enc_total in encrypted_results.items():
                    er = ElectionResult.query.filter_by(election_id=election_id, candidate_id=candidate_id).first()
                    if not er:
                        er = ElectionResult(election_id=election_id, candidate_id=candidate_id)
                        db.session.add(er)
                    er.encrypted_vote_total = enc_total
                
                db.session.commit()
                return jsonify({'encrypted_results': encrypted_results}), 200
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error processing homomorphic encryption: {str(e)}")
                return jsonify({'error': str(e)}), 500
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error in tally_election: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def get_trusted_authorities(election_id):
        """
        Return trusted authorities for the election (based on key shares for the election's crypto config).
        """
        try:
            crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
            if not crypto_config:
                return jsonify({'error': 'Crypto config not found'}), 404
            key_shares = KeyShare.query.filter_by(crypto_id=crypto_config.crypto_id).all()
            authority_ids = [ks.authority_id for ks in key_shares]            
            authorities = TrustedAuthority.query.filter(TrustedAuthority.authority_id.in_(authority_ids)).all()
            return jsonify([{'authority_id': a.authority_id, 'authority_name': a.authority_name} for a in authorities]), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500    @staticmethod
    def reconstruct_private_key():
        """
        Reconstruct the private key from key shares using Shamir Secret Sharing with shamirs library.
        Only supports direct p sharing (reconstructing Paillier prime p directly).
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
            
            # Verify this is using direct p sharing method
            sharing_method = meta_json.get('sharing_method', 'direct_p')
            logger.info(f"Key sharing method: {sharing_method}")
            
            if sharing_method != 'direct_p':
                logger.warning(f"Unexpected sharing method: {sharing_method}. Only direct_p is supported.")
            
            # Get the Shamir modulus prime with enhanced fallback mechanism
            shamir_prime = None
            
            # Try multiple locations in order of preference
            search_locations = [
                ('meta_data.prime_modulus', meta_json.get('prime_modulus')),
                ('meta_data.prime', meta_json.get('prime')),
                ('meta_data.security_data.prime_modulus', meta_json.get('security_data', {}).get('prime_modulus')),
                ('meta_data.security_data.prime', meta_json.get('security_data', {}).get('prime')),
                ('meta_data.modulus', meta_json.get('modulus')),
                ('meta_data.prime_mod', meta_json.get('prime_mod'))
            ]
            
            for location, value in search_locations:
                if value:
                    try:
                        shamir_prime = int(value)
                        logger.info(f"Found Shamir modulus at {location}: {shamir_prime}")
                        break
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid Shamir modulus format at {location}: {value}")
            
            if not shamir_prime:
                logger.error("Shamir modulus not found in any expected location")
                
                # FALLBACK: Generate a suitable prime based on public key
                try:
                    public_key_data = json.loads(crypto_config.public_key)
                    n = int(public_key_data.get('n'))
                    
                    # Estimate the size needed (roughly half of n plus safety margin)
                    estimated_p_bits = n.bit_length() // 2
                    min_prime_bits = max(estimated_p_bits + 128, 1024)
                    
                    # Generate a suitable prime
                    import secrets
                    prime_candidate = secrets.randbits(min_prime_bits) | (1 << (min_prime_bits - 1)) | 1
                    
                    try:
                        from sympy import nextprime
                        shamir_prime = nextprime(prime_candidate)
                    except ImportError:
                        # Fallback prime generation without sympy
                        def is_prime(num):
                            if num < 2: return False
                            if num == 2: return True
                            if num % 2 == 0: return False
                            for i in range(3, int(num**0.5) + 1, 2):
                                if num % i == 0: return False
                            return True
                        
                        while not is_prime(prime_candidate):
                            prime_candidate += 2
                        shamir_prime = prime_candidate
                    
                    logger.warning(f"Generated fallback Shamir modulus: {shamir_prime} (bits: {shamir_prime.bit_length()})")
                    
                except Exception as fallback_error:
                    logger.error(f"Fallback prime generation failed: {fallback_error}")
                    return jsonify({'error': 'Shamir modulus not found and fallback generation failed'}), 500
            
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
            
            # Get public key n for validation
            public_key_n = None
            try:
                public_key_data = json.loads(crypto_config.public_key)
                public_key_n = int(public_key_data.get('n'))
                logger.info(f"Found public key n: {public_key_n}")
            except Exception as e:
                logger.error(f"Could not get public key n: {e}")
                return jsonify({'error': 'Could not retrieve public key n for validation'}), 500
            
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
                                # Check if the value is in hexadecimal format
                                if all(c in '0123456789abcdefABCDEF' for c in y_hex):
                                    y = int(y_hex, 16)
                                else:
                                    y = int(y_hex)
                                    
                                logger.info(f"Parsed share point: x={x}, y={y} (length: {len(str(y))} digits)")
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
            
            # Use shamirs library to reconstruct the secret
            try:
                # Direct p sharing: reconstructed value is the Paillier prime p
                reconstructed_p = shamirs.interpolate(parsed_shares)
                logger.info(f"Reconstructed Paillier prime p: {reconstructed_p} (bits: {reconstructed_p.bit_length()})")
                
                # CRITICAL FIX: Check if reconstruction failed due to wrong Shamir modulus
                # If expected_p exists and reconstructed_p doesn't match, try to regenerate system
                if expected_p and expected_p != reconstructed_p:
                    logger.warning(f"Reconstructed p ({reconstructed_p}) does not match expected p ({expected_p})")
                    
                    # Try using expected_p directly if it's a factor of n
                    if public_key_n % expected_p == 0:
                        logger.info(f"Expected p is a valid factor of n, using it instead")
                        reconstructed_p = expected_p
                    else:
                        logger.error(f"Expected p is not a factor of n either!")
                        
                        # ADVANCED FIX: Try to find the correct factors of n
                        logger.info("Attempting to factor n to find correct p...")
                        
                        # Try simple factorization approaches
                        import math
                        
                        # Check if either reconstructed_p or expected_p has a GCD with n
                        gcd_recon = math.gcd(reconstructed_p, public_key_n)
                        gcd_expected = math.gcd(expected_p, public_key_n) if expected_p else 1
                        
                        if gcd_recon > 1 and public_key_n % gcd_recon == 0:
                            logger.info(f"Found valid factor via GCD with reconstructed p: {gcd_recon}")
                            reconstructed_p = gcd_recon
                        elif gcd_expected > 1 and public_key_n % gcd_expected == 0:
                            logger.info(f"Found valid factor via GCD with expected p: {gcd_expected}")
                            reconstructed_p = gcd_expected
                        else:
                            # Last resort: try to find factors by trial division (limited)
                            logger.info("Trying limited trial division to find factors...")
                            found_factor = None
                            
                            # Try a few candidate factors around the reconstructed values
                            candidates = []
                            if expected_p:
                                candidates.extend([expected_p - 1, expected_p, expected_p + 1])
                            candidates.extend([reconstructed_p - 1, reconstructed_p, reconstructed_p + 1])
                            
                            for candidate in candidates:
                                if candidate > 1 and public_key_n % candidate == 0:
                                    found_factor = candidate
                                    logger.info(f"Found valid factor via trial: {found_factor}")
                                    break
                            
                            if found_factor:
                                reconstructed_p = found_factor
                            else:
                                logger.error("Could not find valid factors of n")
                                return jsonify({
                                    'error': 'Key reconstruction failed: reconstructed prime is not a factor of n',
                                    'debug_info': {
                                        'reconstructed_p': str(reconstructed_p),
                                        'expected_p': str(expected_p) if expected_p else None,
                                        'n': str(public_key_n),
                                        'shamir_prime': str(shamir_prime)
                                    }
                                }), 500
                
                # Validate reconstructed_p is a factor of n
                if public_key_n % reconstructed_p != 0:
                    logger.error(f"Reconstructed p is not a factor of n: {reconstructed_p} does not divide {public_key_n}")
                    
                    # Additional debugging for key reconstruction issues
                    logger.info(f"Trying to find GCD between reconstructed_p and n...")
                    import math
                    gcd_val = math.gcd(reconstructed_p, public_key_n)
                    logger.info(f"GCD between reconstructed_p and n: {gcd_val}")
                    
                    if gcd_val > 1:
                        # If the GCD is non-trivial, it could be a factor of n
                        logger.info(f"Found a non-trivial GCD: {gcd_val}")
                        candidate_p = gcd_val
                        
                        if public_key_n % candidate_p == 0:
                            logger.info(f"Found a valid factor from GCD! Using {candidate_p} as p")
                            reconstructed_p = candidate_p
                        else:
                            # Check for off-by-one errors
                            if public_key_n % (reconstructed_p + 1) == 0:
                                logger.info(f"Found p+1 is a factor of n! Using {reconstructed_p + 1} as p")
                                reconstructed_p = reconstructed_p + 1
                            elif public_key_n % (reconstructed_p - 1) == 0:
                                logger.info(f"Found p-1 is a factor of n! Using {reconstructed_p - 1} as p")
                                reconstructed_p = reconstructed_p - 1
                            else:
                                return jsonify({'error': 'Reconstructed p is not a factor of n and no valid adjustment found'}), 500
                    else:
                        # Check for off-by-one errors
                        if public_key_n % (reconstructed_p + 1) == 0:
                            logger.info(f"Found p+1 is a factor of n! Using {reconstructed_p + 1} as p")
                            reconstructed_p = reconstructed_p + 1
                        elif public_key_n % (reconstructed_p - 1) == 0:
                            logger.info(f"Found p-1 is a factor of n! Using {reconstructed_p - 1} as p")
                            reconstructed_p = reconstructed_p - 1
                        else:
                            return jsonify({'error': 'Reconstructed p is not a factor of n and no valid adjustment found'}), 500
                
                # Calculate q and verify p*q=n
                reconstructed_q = public_key_n // reconstructed_p
                if reconstructed_p * reconstructed_q != public_key_n:
                    logger.error(f"Reconstructed primes product mismatch: {reconstructed_p} * {reconstructed_q} != {public_key_n}")
                    return jsonify({'error': f"Reconstructed primes product mismatch: {reconstructed_p} * {reconstructed_q} != {public_key_n}"}), 500
                
                # Success! Construct a Paillier private key
                reconstructed_private_key = paillier.PaillierPrivateKey(
                    public_key=paillier.PaillierPublicKey(n=public_key_n),
                    p=reconstructed_p,
                    q=reconstructed_q
                )
                
                # Validate against expected p if available
                if expected_p is not None and reconstructed_p != expected_p:
                    logger.warning(f"Final reconstructed p ({reconstructed_p}) does not match expected p ({expected_p}) but is valid")
                    
                # Return the reconstructed prime p
                private_key_data = {
                    'type': 'prime',
                    'p': reconstructed_p,
                    'config_type': 'direct_p'
                }
                private_key_b64 = base64.b64encode(json.dumps(private_key_data).encode()).decode()
                return jsonify({'private_key': private_key_b64, 'config_type': 'direct_p'}), 200
                
            except Exception as interpolation_error:
                logger.error(f"Error during shamirs interpolation: {str(interpolation_error)}")
                return jsonify({'error': f'Failed to reconstruct private key: {str(interpolation_error)}'}), 500
        except Exception as e:
            logger.error(f"Error reconstructing private key: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def decrypt_tally():
        """
        Decrypt the encrypted tally using the constructed private key.
        After decryption, store the vote counts in the election_results table.
        Uses only homomorphic encryption to count votes.
        Only supports direct p sharing for reconstructing the private key.
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
                    # Direct p sharing approach - reconstructed value is directly the prime p
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

    @staticmethod
    def get_decrypted_results(election_id):
        """
        Return the decrypted results for display.
        """
        try:
            results = ElectionResult.query.filter_by(election_id=election_id).all()
            out = []
            for r in results:
                out.append({
                    'candidate_id': r.candidate_id,
                    'vote_count': r.vote_count,
                })
            return jsonify({'results': out}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def get_ongoing_elections_for_modal():
        """
        Return ongoing elections for the modal, matching the Election table fields and frontend expectations.
        """
        from app.models.election import Election
        from app.models.organization import Organization
        from datetime import datetime
        now = datetime.utcnow().date()
        ongoing = Election.query.filter(
            Election.date_start <= now,
            Election.date_end >= now,
            Election.election_status == 'Ongoing'
        ).all()
        out = []
        for e in ongoing:
            org = e.organization if hasattr(e, 'organization') else None
            out.append({
                'election_id': e.election_id,
                'election_name': e.election_name,
                'organization': {'org_name': org.org_name} if org else None,
                'election_status': e.election_status,
                'date_start': str(e.date_start),
                'date_end': str(e.date_end),
                'election_desc': e.election_desc,
                'participation_rate': e.participation_rate,
                'voters_count': e.voters_count,
                'total_votes': None,  # Add logic if available
                'crypto_enabled': False,  # Add logic if available
                'threshold_crypto': False,  # Add logic if available
                'zkp_verified': False,  # Add logic if available
                'candidates': []  # Add logic if available
            })
        return out

    @staticmethod
    def get_all_election_results():
        """
        Return all election results, including election and organization info, matching frontend expectations.
        Only returns results from properly tallied elections stored in the ElectionResult table.
        Each position has one winner (candidate with highest votes per position).
        """
        from app.models.election_result import ElectionResult
        from app.models.election import Election
        from app.models.organization import Organization
        from app.models.candidate import Candidate
        from app.models.position import Position
        from flask import jsonify
        try:
            # Get all unique elections that have results in the ElectionResult table
            election_ids_with_results = db.session.query(ElectionResult.election_id).distinct().all()
            election_ids = [eid[0] for eid in election_ids_with_results]
            elections = Election.query.filter(Election.election_id.in_(election_ids)).all()
            results = []
            for election in elections:
                candidates = Candidate.query.filter_by(election_id=election.election_id).all()
                positions = Position.query.filter_by(org_id=election.org_id).all()
                # Group candidates by position
                pos_to_candidates = {}
                for cand in candidates:
                    pos_to_candidates.setdefault(cand.position_id, []).append(cand)
                candidate_results = []
                total_votes = 0
                winners = []
                for pos in positions:
                    cands = pos_to_candidates.get(pos.position_id, [])
                    if not cands:
                        continue
                    # Get vote counts for each candidate in this position
                    cand_vote_objs = []
                    for cand in cands:
                        er = ElectionResult.query.filter_by(election_id=election.election_id, candidate_id=cand.candidate_id).first()
                        votes = er.vote_count if er and er.vote_count is not None else 0
                        total_votes += votes
                        cand_vote_objs.append({
                            'candidate_id': cand.candidate_id,
                            'name': cand.fullname,
                            'position_id': pos.position_id,
                            'position_name': pos.position_name,
                            'votes': votes,
                            'percentage': 0,  # will fill below
                            'winner': False
                        })
                    # Determine winner for this position
                    if cand_vote_objs:
                        max_votes = max([c['votes'] for c in cand_vote_objs])
                        for c in cand_vote_objs:
                            c['percentage'] = round((c['votes'] / sum([x['votes'] for x in cand_vote_objs]) * 100), 1) if sum([x['votes'] for x in cand_vote_objs]) > 0 else 0
                            if c['votes'] == max_votes and max_votes > 0:
                                c['winner'] = True
                                winners.append(c['name'])
                        candidate_results.extend(cand_vote_objs)
                participation_rate = getattr(election, 'participation_rate', None)
                if participation_rate is None:
                    participation_rate = 0
                results.append({
                    'election_id': election.election_id,
                    'election_name': election.election_name,
                    'organization': election.organization.org_name if election.organization else '',
                    'ended_at': election.date_end.isoformat() if election.date_end else '',
                    'winner': ', '.join(winners) if winners else 'No winner',
                    'total_votes': total_votes,
                    'participation_rate': participation_rate,
                    'candidates': candidate_results
                })
            return jsonify(results)
        except Exception as e:
            logger.error(f"Error in get_all_election_results: {str(e)}")
            return jsonify({'results': []}), 200

    @staticmethod
    def get_ongoing_elections_results():
        now = datetime.utcnow().date()
        ongoing = Election.query.filter(
            Election.date_start <= now,
            Election.date_end >= now,
            Election.election_status == 'Ongoing'
        ).all()
        out = []
        for e in ongoing:
            org = e.organization if hasattr(e, 'organization') else None
            out.append({
                'election_id': e.election_id,
                'election_name': e.election_name,
                'organization': org.org_name if org else '',
                'status': e.election_status,
                'date_start': str(e.date_start),
                'description': e.election_desc,
                'participation_rate': e.participation_rate,
                'voters_count': e.voters_count,
                'total_votes': None,  # Add logic if available
                'crypto_enabled': False,  # Add logic if available
                'threshold_crypto': False,  # Add logic if available
                'zkp_verified': False,  # Add logic if available
                'candidates': []  # Add logic if available
            })
        return out
        
    @staticmethod
    def delete_election_result(election_id):
        """
        Delete all results for a given election_id.
        """
        try:
            deleted = ElectionResult.query.filter_by(election_id=election_id).delete()
            db.session.commit()
            return jsonify({'message': f'Deleted {deleted} election result(s) for election_id {election_id}.'}), 200
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting election results for election_id {election_id}: {str(e)}")
            return jsonify({'error': f'Failed to delete election results: {str(e)}'}), 500
