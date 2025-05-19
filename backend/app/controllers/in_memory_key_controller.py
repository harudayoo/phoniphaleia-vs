from flask import jsonify, request
import json
import logging
import traceback
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from phe import paillier
from app.services.crypto.shamir import split_secret, next_prime, serialize_share, reconstruct_secret

# Set up logging
logger = logging.getLogger(__name__)

class InMemoryKeyController:
    @staticmethod
    def generate_paillier_keypair():
        """
        Generate a Paillier keypair without storing it in the database.
        Returns the public key and key shares for distribution.
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
            
            if crypto_method != 'paillier':
                return jsonify({'error': f'Crypto method {crypto_method} not supported by this endpoint'}), 400
            
            logger.info(f"Parameters: n_personnel={n_personnel}, threshold={threshold}, method={crypto_method}")
            
            # Generate Paillier keypair using the python-paillier library (phe)
            public_key, private_key = paillier.generate_paillier_keypair(n_length=2048)
            
            # For Shamir secret sharing, we'll split p (one of the private key components)
            priv_key_p = int(private_key.p)
            priv_key_q = int(private_key.q)
            
            # Calculate prime modulus for Shamir's scheme
            bits_needed = max(priv_key_p.bit_length() + 128, 512)
            prime_candidate = 2**bits_needed
            prime = next_prime(prime_candidate)
            
            logger.info(f"Splitting private key using Shamir's Secret Sharing with threshold {threshold}/{n_personnel}")
            
            # Generate shares using Shamir's Secret Sharing
            shares_raw_p = split_secret(priv_key_p, n_personnel, threshold)
            
            # Store additional security data
            security_data = {
                "n": str(public_key.n),
                "p_times_q": str(priv_key_p * priv_key_q),
                "prime_modulus": str(prime),
                "key_bits": public_key.n.bit_length()
            }
            
            # Serialize shares for transmission
            shares = [serialize_share(share_p) for share_p in shares_raw_p]
            
            # Prepare the public key (JSON format with metadata)
            public_key_json = json.dumps({
                'n': str(public_key.n),
                'key_type': 'paillier',
                'bit_length': public_key.n.bit_length()
            })
            
            # Return everything without storing in database
            return jsonify({
                'public_key': public_key_json,
                'private_shares': shares,
                'threshold': threshold,
                'crypto_type': 'paillier',
                'key_bits': public_key.n.bit_length(),
                'meta_data': json.dumps({
                    'crypto_type': 'paillier',
                    'n_personnel': n_personnel,
                    'threshold': threshold,
                    'prime': str(prime),
                    'security_data': security_data,
                    'key_bits': public_key.n.bit_length()
                })
            }), 200
                
        except Exception as e:
            logger.error(f"Error generating in-memory keypair: {str(e)}\n{traceback.format_exc()}")
            return jsonify({'error': str(e)}), 500    @staticmethod
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
                
            # Create the crypto config
            try:
                crypto_config = CryptoConfig(
                    election_id=election_id,
                    public_key=public_key,
                    key_type=key_type,
                    status='active',
                    meta_data=meta_data
                )
                
                db.session.add(crypto_config)
                db.session.flush()  # Get ID without committing
                logger.info(f"Created crypto config with ID: {crypto_config.crypto_id}")
            except Exception as crypto_error:
                logger.error(f"Error creating crypto config: {str(crypto_error)}")
                logger.error(traceback.format_exc())
                db.session.rollback()
                return jsonify({'error': f'Failed to create crypto config: {str(crypto_error)}'}), 500
            
            created_shares = []
            
            # Validate authority shares
            if not authority_shares:
                logger.warning("No authority shares provided in the request")
                return jsonify({'error': 'No authority shares provided'}), 400
            
            logger.info(f"Processing {len(authority_shares)} authority shares for crypto config ID {crypto_config.crypto_id}")
            
            # Process each authority share
            for idx, auth_share in enumerate(authority_shares):
                try:
                    # Validate required fields
                    if not auth_share.get('authority_id') or not auth_share.get('share_value'):
                        logger.warning(f"Skipping invalid authority share #{idx}: Missing required fields")
                        continue
                    
                    authority_id = auth_share.get('authority_id')
                    share_value = auth_share.get('share_value')
                    
                    # Verify authority exists
                    authority = TrustedAuthority.query.get(authority_id)
                    if not authority:
                        logger.warning(f"Trusted authority {authority_id} not found, skipping share #{idx}")
                        continue
                    
                    logger.info(f"Processing share #{idx} for authority '{authority.authority_name}' (ID: {authority_id})")
                    
                    # Create new key share
                    try:
                        key_share = KeyShare(
                            crypto_id=crypto_config.crypto_id,
                            authority_id=authority_id,
                            share_value=share_value
                        )
                        
                        db.session.add(key_share)
                        db.session.flush()  # To check if adding worked
                        
                        logger.info(f"Created key share ID {key_share.key_share_id} for authority ID {authority_id}")
                        
                        created_shares.append({
                            'key_share_id': key_share.key_share_id,
                            'authority_id': authority_id,
                            'authority_name': authority.authority_name,
                            'crypto_id': crypto_config.crypto_id
                        })
                    except Exception as key_share_error:
                        logger.error(f"Error creating key share: {str(key_share_error)}")
                        logger.error(traceback.format_exc())
                        continue
                except Exception as share_error:
                    logger.error(f"Error processing share #{idx}: {str(share_error)}")
                    logger.error(traceback.format_exc())
                    continue
            
            # Check if any shares were created
            if len(created_shares) == 0:
                logger.error("No key shares could be created")
                db.session.rollback()
                return jsonify({'error': 'Failed to create any key shares'}), 500
            
            # Commit the transaction
            try:
                db.session.commit()
                logger.info(f"Successfully stored crypto config with ID {crypto_config.crypto_id} and {len(created_shares)} key shares")
                
                # Return success response with details
                return jsonify({
                    'crypto_id': crypto_config.crypto_id,
                    'election_id': election_id,
                    'key_shares': created_shares,
                    'key_shares_count': len(created_shares),
                    'message': 'Crypto configuration and shares stored successfully'
                }), 201
            except Exception as commit_error:
                logger.error(f"Error committing transaction: {str(commit_error)}")
                logger.error(traceback.format_exc())
                db.session.rollback()
                return jsonify({'error': f'Failed to store crypto configuration: {str(commit_error)}'}), 500
                
        except Exception as e:
            if 'db' in locals():
                db.session.rollback()
                
            logger.error(f"Error storing crypto config: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            
            # Extract more details for debugging
            error_details = {
                'message': str(e),
                'type': type(e).__name__
            }
            
            if hasattr(e, '__traceback__'):
                error_details['traceback'] = traceback.format_tb(e.__traceback__)
            
            # Log data that was received (with sensitive parts redacted)
            if 'data' in locals():
                try:
                    safe_data = {
                        'election_id': data.get('election_id'),
                        'key_type': data.get('key_type'),
                        'public_key': data.get('public_key')[:20] + '...' if data.get('public_key') else None,
                        'authority_shares_count': len(data.get('authority_shares', [])),
                    }
                    logger.error(f"Request data (safe): {safe_data}")
                except:
                    pass
                    
            return jsonify({
                'error': f"Failed to store crypto configuration: {str(e)}",
                'details': error_details if logger.isEnabledFor(logging.DEBUG) else None
            }), 500

    @staticmethod
    def check_key_shares_status():
        """
        Check the status of key shares for an election. Returns information about the crypto
        config and associated key shares to help diagnose issues with key share storage.
        """
        try:
            election_id = request.args.get('election_id')
            
            if not election_id:
                return jsonify({'error': 'Election ID is required'}), 400
                
            logger.info(f"Checking key shares status for election {election_id}")
            
            # Import what we need
            from app.models.crypto_config import CryptoConfig
            from app.models.key_share import KeyShare
            from app.models.election import Election
            from app.models.trusted_authority import TrustedAuthority
            from app import db
            
            # Verify the election exists
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': f'Election {election_id} not found'}), 404
                
            # Get crypto config for this election
            crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
            if not crypto_config:
                return jsonify({
                    'election_id': election_id,
                    'election_name': election.election_name,
                    'crypto_config': None,
                    'key_shares': [],
                    'message': 'No crypto configuration found for this election'
                }), 200
            
            # Get key shares for this crypto config
            key_shares = KeyShare.query.filter_by(crypto_id=crypto_config.crypto_id).all()
            
            # Get trusted authorities info
            authority_ids = [share.authority_id for share in key_shares]
            authorities = TrustedAuthority.query.filter(TrustedAuthority.authority_id.in_(authority_ids)).all()
            authority_map = {auth.authority_id: auth.authority_name for auth in authorities}
            
            # Prepare response
            shares_data = []
            for share in key_shares:
                share_preview = '***hidden***'  # Don't expose actual key share values
                authority_name = authority_map.get(share.authority_id, 'Unknown Authority')
                
                shares_data.append({
                    'key_share_id': share.key_share_id,
                    'authority_id': share.authority_id,
                    'authority_name': authority_name,
                    'share_value_length': len(share.share_value) if share.share_value else 0,
                    'created_at': share.created_at.isoformat() if share.created_at else None
                })
            
            return jsonify({
                'election_id': election_id,
                'election_name': election.election_name,
                'crypto_config': {
                    'crypto_id': crypto_config.crypto_id,
                    'key_type': crypto_config.key_type,
                    'status': crypto_config.status,
                    'created_at': crypto_config.created_at.isoformat() if crypto_config.created_at else None,
                    'public_key_length': len(crypto_config.public_key) if crypto_config.public_key else 0
                },
                'key_shares': shares_data,
                'message': f'Found {len(shares_data)} key shares for this election',
                'status': 'success'
            }), 200
                
        except Exception as e:
            logger.error(f"Error checking key shares status: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({
                'error': f"Failed to check key shares status: {str(e)}",
                'details': traceback.format_exc() if logger.isEnabledFor(logging.DEBUG) else None
            }), 500
