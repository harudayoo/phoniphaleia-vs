from flask import jsonify, request
from app.models.crypto_config import CryptoConfig
from app.models.key_share import KeyShare
from app.models.trusted_authority import TrustedAuthority
from app import db
import secrets
import json
import base64
import logging
import traceback
from datetime import datetime
from phe import paillier
from typing import List, Dict, Any, Tuple, Optional
from app.services.crypto.shamir import split_secret, next_prime, serialize_share, reconstruct_secret
from app.services.crypto.threshold_elgamal import ThresholdElGamalService

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
    def generate_key_pair(election_id, n_personnel, threshold, authority_ids=None, crypto_method='paillier'):
        try:
            key_data = {}
            # Primary: Paillier with Shamir Secret Sharing
            if crypto_method == 'paillier':
                logger.info(f"Generating Paillier key pair for election {election_id} with {n_personnel} personnel and threshold {threshold}")
                # Generate Paillier keypair
                public_key, private_key = paillier.generate_paillier_keypair(n_length=2048)
                priv_key_p = int(private_key.p)
                priv_key_q = int(private_key.q)
                # Calculate prime modulus for Shamir's scheme
                bits_needed = max(priv_key_p.bit_length() + 128, 512)
                prime_candidate = 2**bits_needed
                prime = next_prime(prime_candidate)
                logger.info(f"Splitting private key using Shamir's Secret Sharing with threshold {threshold}/{n_personnel}")
                shares_raw_p = split_secret(priv_key_p, n_personnel, threshold)
                security_data = {
                    "n": str(public_key.n),
                    "p_times_q": str(priv_key_p * priv_key_q),
                    "prime_modulus": str(prime),
                    "key_bits": public_key.n.bit_length()
                }
                shares = [serialize_share(share_p) for share_p in shares_raw_p]
                public_key_json = json.dumps({
                    'n': str(public_key.n),
                    'key_type': 'paillier',
                    'bit_length': public_key.n.bit_length()
                })
                crypto_config = CryptoConfig(
                    election_id=election_id,
                    public_key=public_key_json,
                    key_type='paillier',
                    status='active',
                    meta_data=json.dumps({
                        'crypto_type': 'paillier',
                        'n_personnel': n_personnel,
                        'threshold': threshold,
                        'prime': str(prime),
                        'created_at': str(datetime.utcnow()),
                        'security_data': security_data,
                        'key_bits': public_key.n.bit_length()
                    })
                )
                db.session.add(crypto_config)
                db.session.commit()
                # Store key shares in key_shares table if authority_ids are provided
                if authority_ids and len(authority_ids) == len(shares):
                    for i, authority_id in enumerate(authority_ids):
                        key_share = KeyShare(
                            crypto_id=crypto_config.crypto_id,
                            authority_id=authority_id,
                            share_value=shares[i]
                        )
                        db.session.add(key_share)
                    db.session.commit()
                key_data = {
                    "public_key": public_key_json,
                    "serialized_shares": shares,
                    "security_data": security_data
                }
                return key_data
            # Secondary: Threshold ElGamal fallback
            elif crypto_method == 'threshold_elgamal':
                logger.info("Using threshold ElGamal cryptosystem (fallback)")
                try:
                    key_data = ThresholdElGamalService.generate_key_pair(n_personnel, threshold)
                    serialized_public_key = ThresholdElGamalService.serialize_public_key(key_data["public_key"])
                    crypto_config = CryptoConfig(
                        election_id=election_id,
                        public_key=serialized_public_key,
                        key_type='threshold_elgamal',
                        status='active',
                        meta_data=json.dumps({
                            'crypto_type': 'threshold_elgamal',
                            'n_personnel': n_personnel,
                            'threshold': threshold
                        })
                    )
                    db.session.add(crypto_config)
                    db.session.commit()
                    serialized_shares = key_data.get("serialized_shares", [])
                    if authority_ids and len(authority_ids) == len(serialized_shares):
                        for i, authority_id in enumerate(authority_ids):
                            key_share = KeyShare(
                                crypto_id=crypto_config.crypto_id,
                                authority_id=authority_id,
                                share_value=serialized_shares[i]
                            )
                            db.session.add(key_share)
                        db.session.commit()
                    return key_data
                except Exception as e:
                    error_details = traceback.format_exc()
                    logger.error(f"Error generating threshold ElGamal key pair: {str(e)}\n{error_details}")
                    raise
            else:
                raise ValueError(f"Unsupported crypto_method: {crypto_method}")
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
                prime_modulus = int(metadata.get('prime', 0))
                if not prime_modulus:
                    logger.error(f"Prime modulus not found in metadata for crypto config {crypto_id}")
                    return False
                    
                # Reconstruct the secret (p value) from shares
                try:
                    reconstructed_p = reconstruct_secret(shares, prime_modulus)
                    
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
                # Implement threshold ElGamal key share verification
                # This would require a different verification approach specific to ElGamal
                logger.warning("ElGamal key share verification not implemented yet")
                return True
                
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
            
            if crypto_type == 'paillier':
                # Reconstruct the secret from shares
                prime_modulus = int(metadata.get('prime', 0))
                if not prime_modulus:
                    return {'error': 'Prime modulus not found in metadata'}
                
                # Reconstruct the secret (p value) from shares
                try:
                    reconstructed_p = reconstruct_secret(shares, prime_modulus)
                    
                    # Parse the public key to get n
                    public_key_data = json.loads(crypto_config.public_key)
                    n = int(public_key_data.get('n', 0))
                    
                    # Calculate q by dividing n by p
                    reconstructed_q = n // reconstructed_p
                    
                    # Verify p * q = n
                    if reconstructed_p * reconstructed_q != n:
                        return {'error': 'Reconstructed key verification failed'}
                        
                    # Return the reconstructed key information
                    return {
                        'success': True,
                        'crypto_type': 'paillier',
                        'public_key': str(n),
                        'private_key': {
                            'p': str(reconstructed_p),
                            'q': str(reconstructed_q)
                        }
                    }
                    
                except Exception as e:
                    return {'error': f'Error reconstructing secret: {str(e)}'}
            
            elif crypto_type == 'threshold_elgamal':
                # Implement threshold ElGamal key reconstruction
                return {'error': 'ElGamal key reconstruction not implemented yet'}
                
            else:
                return {'error': f'Unknown crypto type {crypto_type}'}
                
        except Exception as e:
            return {'error': f'Error reconstructing key: {str(e)}'}
            
    @staticmethod
    def generate_key_pair_in_memory():
        """
        Generate cryptographic key pairs in memory without storing them in the database.
        This is used when creating a new election to avoid database writes until the election is created.
        """
        try:
            logger.info("Starting in-memory key pair generation")
            data = request.json
            if not data:
                logger.error("No JSON data provided in request")
                return jsonify({'error': 'No JSON data provided'}), 400
                
            # Parameters for key generation
            n_personnel = int(data.get('n_personnel', 3))
            threshold = int(data.get('threshold', n_personnel))
            crypto_method = data.get('crypto_method', 'paillier')
            authority_names = data.get('authority_names', [])  # Names of authorities instead of IDs
            
            logger.info(f"In-memory key generation with parameters: n_personnel={n_personnel}, threshold={threshold}, method={crypto_method}")
            
            if crypto_method == 'threshold_elgamal':
                # Use threshold ElGamal for distributed decryption
                logger.info("Using threshold ElGamal cryptosystem (in memory)")
                try:
                    key_data = ThresholdElGamalService.generate_key_pair(n_personnel, threshold)
                    logger.info("Successfully generated threshold ElGamal key pair")
                    
                    serialized_public_key = ThresholdElGamalService.serialize_public_key(key_data["public_key"])
                    
                    # Prepare shares for distribution
                    serialized_shares = key_data.get("serialized_shares", [])
                    if not serialized_shares and "key_shares" in key_data:
                        # Serialize shares if they're not already
                        key_shares = key_data["key_shares"]
                        serialized_shares = [ThresholdElGamalService.serialize_key_share(share) if isinstance(share, dict) else share for share in key_shares]
                    
                    # Create mapping between authority names and shares
                    authority_shares_mapping = []
                    for i, name in enumerate(authority_names[:len(serialized_shares)]):
                        authority_shares_mapping.append({
                            'name': name,
                            'share': serialized_shares[i]
                        })
                    
                    # Return the key data formatted for distribution
                    return jsonify({
                        'public_key': serialized_public_key,
                        'private_shares': serialized_shares,
                        'authority_shares': authority_shares_mapping,
                        'threshold': threshold,
                        'crypto_type': 'threshold_elgamal'
                    }), 200
                except Exception as e:
                    error_details = traceback.format_exc()
                    logger.error(f"Error generating threshold ElGamal key pair: {str(e)}\n{error_details}")
                    return jsonify({'error': f"Failed to generate key pair: {str(e)}"}), 500
            else:
                # Use Paillier with Shamir secret sharing
                logger.info(f"Generating Paillier key pair in memory with {n_personnel} personnel")
                
                # Generate Paillier keypair
                public_key, private_key = paillier.generate_paillier_keypair(n_length=2048)
                
                # Split the private key using Shamir's Secret Sharing
                priv_key_p = int(private_key.p)
                priv_key_q = int(private_key.q)
                
                # Calculate prime modulus for Shamir's scheme
                bits_needed = max(priv_key_p.bit_length() + 128, 512)
                prime_candidate = 2**bits_needed
                prime = next_prime(prime_candidate)
                
                logger.info(f"Splitting private key using Shamir's Secret Sharing with threshold {threshold}/{n_personnel}")
                
                # Generate shares
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
                
                # Prepare the public key for transmission
                public_key_json = json.dumps({
                    'n': str(public_key.n),
                    'key_type': 'paillier',
                    'bit_length': public_key.n.bit_length()
                })
                
                # Create mapping between authority names and shares
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
                    'key_bits': public_key.n.bit_length()
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
            authority_shares = data.get('authority_shares', [])
            threshold = data.get('threshold')
            security_data = data.get('security_data', {})
            
            if not election_id:
                return jsonify({'error': 'Election ID is required'}), 400
                
            if not public_key:
                return jsonify({'error': 'Public key is required'}), 400
                
            logger.info(f"Storing crypto data for election ID: {election_id}, type: {crypto_type}")
            
            # Create metadata based on crypto type
            meta_data = {
                'crypto_type': crypto_type,
                'threshold': threshold,
                'n_personnel': len(authority_shares),
                'created_at': str(datetime.utcnow())
            }
            
            # Add security data if available
            if security_data:
                meta_data['security_data'] = security_data
                
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
            
            # Create the trusted authorities and assign key shares
            created_authorities = []
            for authority_data in authority_shares:
                name = authority_data.get('name')
                share = authority_data.get('share')
                
                if not name or not share:
                    continue
                    
                # Create the trusted authority
                authority = TrustedAuthority(
                    authority_name=name,
                    contact_info='',
                    election_id=election_id
                )
                db.session.add(authority)
                db.session.flush()  # Get the ID without committing
                
                # Create the key share
                key_share = KeyShare(
                    crypto_id=crypto_config.crypto_id,
                    authority_id=authority.authority_id,
                    share_value=share
                )
                db.session.add(key_share)
                
                created_authorities.append({
                    'id': authority.authority_id,
                    'name': name
                })
                
            db.session.commit()
            
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
