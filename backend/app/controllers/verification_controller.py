"""
Controller for handling ZKP verification and vote decryption
Only using Paillier with Shamir secret sharing
"""
from flask import request, jsonify
from app.services.zkp.snarkjs_verifier import SnarkjsVerifier
from app.models.crypto_config import CryptoConfig
from app.models.key_share import KeyShare
from app.models.vote import Vote
from app.models.election import Election
from app.models.election_result import ElectionResult
from app.models.trusted_authority import TrustedAuthority
from app.services.authentication_service import AuthenticationService
from app import db
from typing import Dict, Any, List, Optional, Tuple
import json
import os
import logging
import base64
import traceback
from datetime import datetime
from phe import paillier
import shamirs

logger = logging.getLogger(__name__)

class VerificationController:
    @staticmethod
    def get_verification_key():
        """
        Get the verification key for ZKP verification
        """
        try:
            # Check if election_id is provided
            election_id = request.args.get("election_id")
            
            if election_id:
                # Try to get the verification key specific to this election
                crypto_config = CryptoConfig.query.filter_by(
                    election_id=election_id, 
                    key_type="verification_key"
                ).first()
                
                if crypto_config:
                    return jsonify({"verification_key": crypto_config.public_key}), 200
            
            # If no election-specific key is found or no election_id is provided,
            # look for a default verification key
            default_key_config = CryptoConfig.query.filter_by(
                key_type="default_verification_key"
            ).first()
            
            if default_key_config:
                return jsonify({"verification_key": default_key_config.public_key}), 200
                
            # If no key is found, try to read from file
            verification_key_path = os.path.join(
                os.path.dirname(__file__), 
                '../../public/verification_key.json'
            )
            
            if os.path.exists(verification_key_path):
                with open(verification_key_path, 'r') as f:
                    verification_key = f.read()
                return jsonify({"verification_key": verification_key}), 200
                return jsonify({"error": "No verification key found"}), 404
            
        except Exception as e:
            logger.error(f"Error retrieving verification key: {str(e)}")
            return jsonify({"error": f"Failed to retrieve verification key: {str(e)}"}), 500
            
    @staticmethod
    def verify_vote_zkp():
        """
        Verify a ZKP for a vote
        """
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({"error": "No data provided"}), 400
                
            # Extract the proof and public signals
            proof = data.get("proof")
            public_signals = data.get("publicSignals")
            
            if not proof or not public_signals:
                return jsonify({"error": "Missing proof or public signals"}), 400
                
            # Get the verification key (try to use the one provided in request first)
            verification_key = data.get("verificationKey")
            
            if not verification_key:
                # If no verification key provided, use the default
                verification_key_response = VerificationController.get_verification_key()
                if verification_key_response[1] != 200:
                    return verification_key_response
                verification_key = verification_key_response[0].json.get("verification_key")
                
            # Verify the proof
            is_valid = SnarkjsVerifier.verify(
                verification_key=verification_key,
                public_signals=public_signals,
                proof=proof
            )
            
            return jsonify({"valid": is_valid}), 200
            
        except Exception as e:
            logger.error(f"Error verifying vote: {str(e)}")
            return jsonify({"error": f"Verification failed: {str(e)}"}), 500

    @staticmethod
    def decrypt_vote():
        """
        Decrypt a vote using Paillier homomorphic encryption with Shamir secret sharing
        """
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        try:
            # Extract required data
            encrypted_vote = data.get("encryptedVote")
            election_id = data.get("electionId")
            shares = data.get("shares", [])
            
            if not encrypted_vote or not election_id:
                return jsonify({"error": "Missing required data"}), 400
                
            # Get the crypto config for this election
            crypto_config = CryptoConfig.query.filter_by(
                election_id=election_id,
                key_type="paillier",
                status="active"
            ).first()
            
            if not crypto_config:
                return jsonify({"error": "Crypto configuration not found for this election"}), 404
                
            # Parse metadata to get prime modulus
            meta_data = json.loads(crypto_config.meta_data)
            
            # Enhanced prime modulus search with fallback
            prime = None
            search_locations = [
                ('prime', meta_data.get('prime')),
                ('prime_modulus', meta_data.get('prime_modulus')),
                ('prime_mod', meta_data.get('prime_mod')),
                ('modulus', meta_data.get('modulus')),
                ('security_data.prime_modulus', meta_data.get('security_data', {}).get('prime_modulus')),
                ('security_data.prime', meta_data.get('security_data', {}).get('prime')),
                ('security_data.modulus', meta_data.get('security_data', {}).get('modulus'))
            ]
            
            for location, value in search_locations:
                if value:
                    try:
                        prime = int(value)
                        logger.info(f"Found prime modulus at {location}: {prime}")
                        break
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid prime format at {location}: {value}")
                        continue
            
            if not prime:
                # Fallback: Generate suitable prime based on public key
                try:
                    public_key_data = json.loads(crypto_config.public_key)
                    n = int(public_key_data.get('n'))
                    
                    # Estimate needed prime size
                    estimated_bits = max(n.bit_length() // 2 + 128, 1024)
                    
                    import secrets
                    prime_candidate = secrets.randbits(estimated_bits) | (1 << (estimated_bits - 1)) | 1
                    
                    try:
                        from sympy import nextprime
                        prime = nextprime(prime_candidate)
                    except ImportError:
                        # Simple prime check for fallback
                        def is_prime(num):
                            if num < 2: return False
                            if num == 2: return True
                            if num % 2 == 0: return False
                            for i in range(3, int(num**0.5) + 1, 2):
                                if num % i == 0: return False
                            return True
                        
                        while not is_prime(prime_candidate):
                            prime_candidate += 2
                        prime = prime_candidate
                    
                    logger.warning(f"Generated fallback prime modulus: {prime}")
                    
                except Exception as e:
                    logger.error(f"Fallback prime generation failed: {e}")
                    return jsonify({"error": "Prime modulus not found and fallback generation failed"}), 500
            
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
                                # Parse x:hex(y) format
                                x_str, y_hex = s.split(':', 1)
                                x = int(x_str)
                                y = int(y_hex, 16)
                                # Create proper shamirs.share object
                                share_obj = shamirs.share(x, y, prime)
                                parsed_shares.append(share_obj)
                                continue
                            except Exception as e:
                                logger.warning(f"Failed to parse share as x:hex(y): {e}")
                        
                        # Try parsing as JSON format like "(x, y)"
                        try:
                            share_data = json.loads(s)
                            if isinstance(share_data, list) and len(share_data) == 2:
                                # Create proper shamirs.share object
                                share_obj = shamirs.share(int(share_data[0]), int(share_data[1]), prime)
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
                                    # Create proper shamirs.share object
                                    share_obj = shamirs.share(int(parts[0]), int(parts[1]), prime)
                                    parsed_shares.append(share_obj)
                                    continue
                        except Exception as e:
                            logger.warning(f"Failed to parse share as tuple string: {e}")
                        
                        logger.error(f"Could not parse share in any recognized format: {s}")
                        return jsonify({'error': f'Invalid share format in: {s}'}), 400
                        
                    elif isinstance(s, (list, tuple)) and len(s) == 2:
                        # Create proper shamirs.share object
                        share_obj = shamirs.share(int(s[0]), int(s[1]), prime)
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
                reconstructed_p = shamirs.interpolate(parsed_shares)
                logger.info(f"Reconstructed secret (p): {reconstructed_p}")
                
            except Exception as interpolation_error:
                logger.error(f"Error during shamirs interpolation: {str(interpolation_error)}")
                return jsonify({'error': f'Failed to reconstruct private key: {str(interpolation_error)}'}), 500
            
            # Parse the public key to get n
            public_key_data = json.loads(crypto_config.public_key)
            n = int(public_key_data.get('n', 0))
            
            # Calculate q by dividing n by p
            reconstructed_q = n // reconstructed_p
            
            # Create the Paillier objects
            pubkey = paillier.PaillierPublicKey(n=n)
            privkey = paillier.PaillierPrivateKey(pubkey, reconstructed_p, reconstructed_q)
            
            # Decrypt the vote
            encrypted_num = paillier.EncryptedNumber(pubkey, int(encrypted_vote), 0)
            decrypted_vote = privkey.decrypt(encrypted_num)
            
            return jsonify({"decryptedVote": decrypted_vote}), 200
            
        except Exception as e:
            logger.error(f"Error decrypting vote: {str(e)}")
            return jsonify({"error": f"Decryption failed: {str(e)}"}), 500

    @staticmethod
    def generate_partial_decryption():
        """
        Generate a partial decryption using Shamir secret sharing (for collecting shares)
        """
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        try:
            # Extract required data
            encrypted_vote = data.get("encryptedVote")
            election_id = data.get("electionId")
            authority_id = data.get("authorityId")
            
            if not encrypted_vote or not election_id or not authority_id:
                return jsonify({"error": "Missing required data"}), 400
                
            # Get the crypto config for this election
            crypto_config = CryptoConfig.query.filter_by(
                election_id=election_id,
                key_type="paillier",
                status="active"
            ).first()
            
            if not crypto_config:
                return jsonify({"error": "Crypto configuration not found for this election"}), 404
                
            # Get the key share for this authority
            key_share = KeyShare.query.filter_by(
                crypto_id=crypto_config.crypto_id,
                authority_id=authority_id
            ).first()
            
            if not key_share:
                return jsonify({"error": "Key share not found for this authority"}), 404
            
            # For Shamir key sharing, we just return the share directly
            # The actual decryption will happen when all shares are combined
            
            return jsonify({
                "id": authority_id,
                "share": key_share.share_value
            }), 200
            
        except Exception as e:
            logger.error(f"Error generating partial decryption: {str(e)}")
            return jsonify({"error": f"Generation failed: {str(e)}"}), 500

    @staticmethod
    def submit_partial_decryption():
        """
        Submit a partial decryption for an encrypted vote using Shamir secret sharing
        """
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        try:
            # Extract required data
            encrypted_vote = data.get("encryptedVote")
            election_id = data.get("electionId")
            authority_id = data.get("authorityId")
            key_share_id = data.get("keyShareId")
            
            if not encrypted_vote or not election_id or not authority_id:
                return jsonify({"error": "Missing required data"}), 400
                
            # Get the crypto config for this election
            crypto_config = CryptoConfig.query.filter_by(
                election_id=election_id,
                key_type="paillier",
                status="active"
            ).first()
            
            if not crypto_config:
                return jsonify({"error": "Crypto configuration not found for this election"}), 404
                
            # Get the key share for this authority
            key_share = KeyShare.query.filter_by(
                crypto_id=crypto_config.crypto_id,
                authority_id=authority_id
            ).first()
            
            if not key_share:
                return jsonify({"error": "Key share not found for this authority"}), 404
            
            # For Shamir key sharing, we submit the share value to be used in reconstruction
            # Store the submission info in the database (optional logic)
            
            return jsonify({
                "id": key_share_id or authority_id,
                "partialDecryption": key_share.share_value,
                "authorityId": authority_id,
                "timestamp": datetime.utcnow().isoformat()
            }), 200
            
        except Exception as e:
            logger.error(f"Error submitting partial decryption: {str(e)}")
            return jsonify({"error": f"Submission failed: {str(e)}"}), 500

    @staticmethod
    def verify_authority():
        """
        Verify a trusted authority's authentication using challenge-response
        """
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        try:
            # Extract required data
            authority_id = data.get("authorityId")
            challenge = data.get("challenge")
            response_data = data.get("response")
            public_key_fingerprint = data.get("publicKeyFingerprint")
            
            if not authority_id or not challenge or not response_data or not public_key_fingerprint:
                return jsonify({"error": "Missing required authentication data"}), 400
                
            # Check if authority exists
            authority = TrustedAuthority.query.get(authority_id)
            if not authority:
                return jsonify({"error": "Trusted authority not found"}), 404
                
            # Validate the challenge response
            is_valid = AuthenticationService.validate_response(
                authority_id=authority_id,
                challenge=challenge,
                response=response_data,
                public_key_fingerprint=public_key_fingerprint
            )
            
            if not is_valid:
                return jsonify({"error": "Invalid authentication response"}), 401
                
            # Create a short-lived token for this authority session
            token = AuthenticationService.create_authority_token(authority_id)
            
            return jsonify({
                "verified": True,
                "token": token,
                "authority": {
                    "id": authority.authority_id,
                    "name": authority.authority_name
                }
            }), 200
            
        except Exception as e:
            logger.error(f"Error verifying authority: {str(e)}")
            return jsonify({"error": f"Verification failed: {str(e)}"}), 500

    @staticmethod
    def verify_and_store_vote():
        """
        Verify a vote using ZKP and store it in the database
        """
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({"error": "No data provided"}), 400
                
            # Extract required data
            vote_data = data.get("vote")
            proof = data.get("proof", {}).get("zkp")
            public_signals = data.get("proof", {}).get("public_signals")
            
            if not vote_data or not proof or not public_signals:
                return jsonify({"error": "Missing required vote data or proof"}), 400
                
            # Verify the vote's ZKP
            verification_result = VerificationController.verify_vote()
            if verification_result[1] != 200 or not verification_result[0].json.get("valid"):
                logger.error(f"ZKP verification failed: {verification_result}")
                return jsonify({
                    "error": "Vote proof verification failed", 
                    "details": verification_result[0].json
                }), 400
                
            # Store the vote
            try:
                vote_obj = Vote(
                    election_id=vote_data.get("election_id"),
                    position_id=vote_data.get("position_id"),
                    candidate_id=vote_data.get("candidate_id"),
                    encrypted_vote=vote_data.get("encrypted_vote"),
                    proof=json.dumps({
                        "zkp": proof,
                        "public_signals": public_signals
                    })
                )
                
                db.session.add(vote_obj)
                db.session.commit()
                
                return jsonify({
                    "success": True,
                    "message": "Vote successfully verified and stored",
                    "vote_id": vote_obj.vote_id
                }), 201
                
            except Exception as db_error:
                db.session.rollback()
                logger.error(f"Database error storing vote: {str(db_error)}")
                return jsonify({"error": f"Error storing vote: {str(db_error)}"}), 500
                
        except Exception as e:
            logger.error(f"Error verifying and storing vote: {str(e)}")
            return jsonify({"error": f"Vote processing failed: {str(e)}"}), 500

    @staticmethod
    def get_verification_status():
        """
        Get verification status for an election
        """
        try:
            election_id = request.args.get("election_id")
            
            if not election_id:
                return jsonify({"error": "Missing election ID"}), 400
                
            # Get the election
            election = Election.query.get(election_id)
            if not election:
                return jsonify({"error": "Election not found"}), 404
                
            # Count votes
            total_votes = Vote.query.filter_by(election_id=election_id).count()
            
            # Get crypto config
            crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
            
            return jsonify({
                "election_id": election_id,
                "election_name": election.election_name,
                "total_votes": total_votes,
                "has_crypto_config": crypto_config is not None,
                "verification_status": {
                    "votes_verified": True,  # Assuming all stored votes are already verified
                    "tally_status": "Not started" if not ElectionResult.query.filter_by(election_id=election_id).first() else "Complete",
                    "decryption_status": "Not started"  # Would need additional logic to determine this
                }
            }), 200
            
        except Exception as e:
            logger.error(f"Error getting verification status: {str(e)}")
            return jsonify({"error": f"Failed to get status: {str(e)}"}), 500

    @staticmethod
    def decrypt_election_results():
        """
        Decrypt all election results using collected Shamir shares
        """
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({"error": "No data provided"}), 400
                
            # Extract required data
            election_id = data.get("electionId")
            partial_decryptions = data.get("partialDecryptions", [])
            
            if not election_id:
                return jsonify({"error": "Missing election ID"}), 400
                
            if not partial_decryptions or len(partial_decryptions) == 0:
                return jsonify({"error": "No partial decryptions provided"}), 400
            
            # Get the crypto config for this election
            crypto_config = CryptoConfig.query.filter_by(
                election_id=election_id,
                key_type="paillier",
                status="active"
            ).first()
            
            if not crypto_config:
                return jsonify({"error": "Crypto configuration not found for this election"}), 404
                
            # Parse metadata to get prime modulus
            meta_data = json.loads(crypto_config.meta_data)
            
            # Try to get prime from multiple possible locations with enhanced robustness
            prime = None
            for key in ['prime', 'prime_modulus', 'prime_mod', 'modulus']:
                if key in meta_data and meta_data[key]:
                    try:
                        prime = int(meta_data[key])
                        break
                    except (ValueError, TypeError):
                        continue
            
            # Check in security_data if present
            if not prime and 'security_data' in meta_data and meta_data['security_data']:
                security_data = meta_data['security_data']
                for key in ['prime_modulus', 'prime', 'modulus']:
                    if key in security_data and security_data[key]:
                        try:
                            prime = int(security_data[key])
                            break
                        except (ValueError, TypeError):
                            continue
            if not prime:
                return jsonify({"error": "Prime modulus not found in crypto config"}), 500
              # Get all shares from the partial decryptions
            shares = []
            for pd in partial_decryptions:
                authority_id = pd.get("authorityId")
                authority_shares = pd.get("votes", {})
                
                for vote_id, vote_data in authority_shares.items():
                    if vote_data.get("partialDecryption"):
                        shares.append(vote_data.get("partialDecryption"))
            
            if len(shares) == 0:
                return jsonify({"error": "No valid shares found in partial decryptions"}), 400
            
            # Parse shares to proper format for shamirs library
            parsed_shares = []
            logger.info(f"Received shares for election results: {shares}")
            
            for s in shares:
                logger.info(f"Processing share: {s}")
                if not s or (isinstance(s, str) and s.strip() == ""):
                    continue
                
                try:
                    if isinstance(s, str):
                        if ':' in s:
                            try:
                                # Parse x:hex(y) format
                                x_str, y_hex = s.split(':', 1)
                                x = int(x_str)
                                y = int(y_hex, 16)
                                # Create proper shamirs.share object
                                share_obj = shamirs.share(x, y, prime)
                                parsed_shares.append(share_obj)
                                continue
                            except Exception as e:
                                logger.warning(f"Failed to parse share as x:hex(y): {e}")
                        
                        # Try parsing as JSON format like "(x, y)"
                        try:
                            share_data = json.loads(s)
                            if isinstance(share_data, list) and len(share_data) == 2:
                                # Create proper shamirs.share object
                                share_obj = shamirs.share(int(share_data[0]), int(share_data[1]), prime)
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
                                    # Create proper shamirs.share object
                                    share_obj = shamirs.share(int(parts[0]), int(parts[1]), prime)
                                    parsed_shares.append(share_obj)
                                    continue
                        except Exception as e:
                            logger.warning(f"Failed to parse share as tuple string: {e}")
                        
                        logger.error(f"Could not parse share in any recognized format: {s}")
                        return jsonify({'error': f'Invalid share format in: {s}'}), 400
                        
                    elif isinstance(s, (list, tuple)) and len(s) == 2:
                        # Create proper shamirs.share object
                        share_obj = shamirs.share(int(s[0]), int(s[1]), prime)
                        parsed_shares.append(share_obj)
                    else:
                        logger.error(f"Invalid share type: {type(s)}, value: {s}")
                        return jsonify({'error': f'Invalid share format: {s}'}), 400
                        
                except Exception as e:
                    logger.error(f"Error parsing share {s}: {str(e)}")
                    return jsonify({'error': f'Error parsing share: {str(e)}'}), 400
            
            if not parsed_shares:
                logger.error("No valid shares were parsed for election results")
                return jsonify({'error': 'No valid shares could be parsed from the input'}), 400
            
            logger.info(f"Successfully parsed {len(parsed_shares)} shares for election results as shamirs.share objects")
              # Use shamirs library to reconstruct the secret
            try:
                reconstructed_p = shamirs.interpolate(parsed_shares)
                logger.info(f"Reconstructed secret (p) for election results: {reconstructed_p}")
                
            except Exception as interpolation_error:
                logger.error(f"Error during shamirs interpolation for election results: {str(interpolation_error)}")
                return jsonify({'error': f'Failed to reconstruct private key: {str(interpolation_error)}'}), 500
            
            # Parse the public key to get n
            public_key_data = json.loads(crypto_config.public_key)
            n = int(public_key_data.get('n', 0))
            
            # Calculate q by dividing n by p
            reconstructed_q = n // reconstructed_p
            
            # Create the Paillier objects
            pubkey = paillier.PaillierPublicKey(n=n)
            privkey = paillier.PaillierPrivateKey(pubkey, reconstructed_p, reconstructed_q)
            
            # Decrypt all votes in the election
            votes = Vote.query.filter_by(election_id=election_id).all()
            decrypted_results = {}
            
            for vote in votes:
                try:
                    encrypted_num = paillier.EncryptedNumber(pubkey, int(vote.encrypted_vote), 0)
                    decrypted_vote = privkey.decrypt(encrypted_num)
                    
                    position_id = vote.position_id
                    candidate_id = vote.candidate_id
                    
                    if position_id not in decrypted_results:
                        decrypted_results[position_id] = {}
                    
                    if candidate_id not in decrypted_results[position_id]:
                        decrypted_results[position_id][candidate_id] = 0
                    
                    decrypted_results[position_id][candidate_id] += decrypted_vote
                    
                    # Store the decrypted result
                    result = ElectionResult.query.filter_by(
                        election_id=election_id,
                        position_id=position_id,
                        candidate_id=candidate_id
                    ).first()
                    
                    if not result:
                        result = ElectionResult(
                            election_id=election_id,
                            position_id=position_id,
                            candidate_id=candidate_id,
                            vote_count=decrypted_vote
                        )
                        db.session.add(result)
                    else:
                        result.vote_count = decrypted_results[position_id][candidate_id]
                        
                except Exception as vote_error:
                    logger.error(f"Error decrypting vote {vote.vote_id}: {str(vote_error)}")
            
            db.session.commit()
            
            return jsonify({
                "success": True,
                "electionId": election_id,
                "results": decrypted_results
            }), 200
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error decrypting election results: {str(e)}")
            return jsonify({"error": f"Decryption failed: {str(e)}"}), 500
