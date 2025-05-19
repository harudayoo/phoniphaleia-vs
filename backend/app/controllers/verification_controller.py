"""
Controller for handling ZKP verification and vote decryption
"""
from flask import request, jsonify
from app.services.zkp.snarkjs_verifier import SnarkjsVerifier
from app.services.crypto.threshold_elgamal import ThresholdElGamalService
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
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                "services", "zkp", "verification_key.json"
            )
            
            if os.path.exists(verification_key_path):
                with open(verification_key_path, "r") as f:
                    verification_key = f.read()
                return jsonify({"verification_key": verification_key}), 200
            
            return jsonify({"error": "Verification key not found"}), 404
            
        except Exception as e:
            logger.error(f"Error getting verification key: {str(e)}")
            return jsonify({"error": f"Failed to get verification key: {str(e)}"}), 500
    
    @staticmethod
    def verify_vote_zkp():
        """
        Verify a vote using zero-knowledge proof
        """
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Extract required data
        try:
            proof = data.get("proof")
            public_signals = data.get("publicSignals")
            election_id = data.get("electionId")
            
            if not proof or not public_signals or not election_id:
                return jsonify({"error": "Missing required data"}), 400
                
            # Get the verification key for this election
            crypto_config = CryptoConfig.query.filter_by(
                election_id=election_id, 
                key_type="verification_key"
            ).first()
            
            if not crypto_config:
                return jsonify({"error": "Verification key not found for this election"}), 404
                
            # Parse the verification key
            verification_key = json.loads(crypto_config.public_key)
            
            # Verify the proof
            is_valid = SnarkjsVerifier.verify_proof(
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
        Decrypt a vote using threshold ElGamal
        """
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        try:
            # Extract required data
            encrypted_vote = data.get("encryptedVote")
            election_id = data.get("electionId")
            partial_decryptions = data.get("partialDecryptions", [])
            
            if not encrypted_vote or not election_id:
                return jsonify({"error": "Missing required data"}), 400
                
            # Get the crypto config for this election
            crypto_config = CryptoConfig.query.filter_by(
                election_id=election_id,
                key_type="threshold_elgamal",
                status="active"
            ).first()
            
            if not crypto_config:
                return jsonify({"error": "Crypto configuration not found for this election"}), 404
                
            # Parse the partial decryptions
            parsed_partial_decryptions = []
            for pd in partial_decryptions:
                parsed_partial_decryptions.append((pd["id"], pd["partialDecryption"]))
                
            # Combine the partial decryptions to reveal the vote
            decrypted_vote = ThresholdElGamalService.combine_partial_decryptions(
                public_key_json=crypto_config.public_key,
                encrypted_vote=encrypted_vote,
                partial_decryptions=parsed_partial_decryptions
            )
            
            return jsonify({"decryptedVote": decrypted_vote}), 200
            
        except Exception as e:
            logger.error(f"Error decrypting vote: {str(e)}")
            return jsonify({"error": f"Decryption failed: {str(e)}"}), 500    @staticmethod
    def submit_partial_decryption():
        """
        Submit a partial decryption for a vote
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
            
            # Authentication data for challenge-response is validated by decorator
            # so we don't need to validate it here
            
            # Check for required operation data
            if not encrypted_vote or not election_id or not authority_id or not key_share_id:
                return jsonify({"error": "Missing required operation data"}), 400
                
            # Get the crypto config for this election
            crypto_config = CryptoConfig.query.filter_by(
                election_id=election_id,
                key_type="threshold_elgamal",
                status="active"
            ).first()
            
            if not crypto_config:
                return jsonify({"error": "Crypto configuration not found for this election"}), 404
                
            # Get the key share
            key_share = KeyShare.query.filter_by(
                id=key_share_id,
                crypto_id=crypto_config.id,
                trusted_authority_id=authority_id
            ).first()
            
            if not key_share:
                return jsonify({"error": "Key share not found"}), 404
                
            # Generate the partial decryption
            partial_dec = ThresholdElGamalService.generate_partial_decryption(
                public_key_json=crypto_config.public_key,
                key_share=key_share.share_value,
                encrypted_vote=encrypted_vote
            )
            
            return jsonify({
                "id": key_share.share_index,
                "partialDecryption": partial_dec["partial_decryption"]
            }), 200
            
        except Exception as e:
            logger.error(f"Error generating partial decryption: {str(e)}")
            return jsonify({"error": f"Generation failed: {str(e)}"}), 500

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
                
            return jsonify({"valid": True}), 200
            
        except Exception as e:
            logger.error(f"Error verifying trusted authority: {str(e)}")
            return jsonify({"error": f"Verification failed: {str(e)}"}), 500

    @staticmethod
    def decrypt_election_results():
        """
        Decrypt all votes for an election and compute the results
        """
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        try:
            # Extract required data
            election_id = data.get("electionId")
            partial_decryptions_by_authority = data.get("partialDecryptions", [])
            
            if not election_id:
                return jsonify({"error": "Missing required data"}), 400
                
            # Get the election
            election = Election.query.get(election_id)
            if not election:
                return jsonify({"error": "Election not found"}), 404
                
            # Get the crypto config
            crypto_config = CryptoConfig.query.filter_by(
                election_id=election_id,
                key_type="threshold_elgamal",
                status="active"
            ).first()
            
            if not crypto_config:
                return jsonify({"error": "Crypto configuration not found"}), 404
                
            # Get all votes for this election
            votes = Vote.query.filter_by(election_id=election_id).all()
            
            # Group votes by position
            votes_by_position = {}
            for vote in votes:
                position_id = vote.position_id
                if position_id not in votes_by_position:
                    votes_by_position[position_id] = []
                votes_by_position[position_id].append(vote)
            
            # Process each position
            results = []
            for position_id, position_votes in votes_by_position.items():
                position_result = {
                    "position_id": position_id,
                    "candidate_results": {}
                }
                
                # Process each vote
                for vote in position_votes:
                    encrypted_vote = json.loads(vote.vote_data)
                    
                    # Get partial decryptions for this vote
                    vote_partial_decryptions = []
                    for authority_pd in partial_decryptions_by_authority:
                        authority_id = authority_pd["authorityId"]
                        vote_id_pds = authority_pd.get("votes", {})
                        
                        if str(vote.id) in vote_id_pds:
                            pd = vote_id_pds[str(vote.id)]
                            vote_partial_decryptions.append((pd["id"], pd["partialDecryption"]))
                      # Only attempt decryption if we have enough partial decryptions
                    if len(vote_partial_decryptions) >= int(json.loads(crypto_config.meta_data)["t"]):
                        try:
                            # Decrypt the vote
                            candidate_id = ThresholdElGamalService.combine_partial_decryptions(
                                public_key_json=crypto_config.public_key,
                                encrypted_vote=encrypted_vote,
                                partial_decryptions=vote_partial_decryptions
                            )
                            
                            # Update the results counter
                            str_candidate_id = str(candidate_id)
                            if str_candidate_id not in position_result["candidate_results"]:
                                position_result["candidate_results"][str_candidate_id] = 0
                            position_result["candidate_results"][str_candidate_id] += 1
                            
                        except Exception as e:
                            logger.warning(f"Failed to decrypt vote {vote.id}: {e}")
                            continue
                
                results.append(position_result)
            
            # Save the results to the database
            for position_result in results:
                # Check if a result already exists
                existing_result = ElectionResult.query.filter_by(
                    election_id=election_id,
                    position_id=position_result["position_id"]
                ).first()
                
                # Convert candidate results to JSON
                results_json = json.dumps(position_result["candidate_results"])
                
                if existing_result:
                    # Update existing result
                    existing_result.result_data = results_json
                    existing_result.status = "computed"
                else:
                    # Create new result
                    new_result = ElectionResult(
                        election_id=election_id,
                        position_id=position_result["position_id"],
                        result_data=results_json,
                        status="computed"
                    )
                    db.session.add(new_result)
            
            # Commit the changes
            db.session.commit()
            
            return jsonify({
                "success": True,
                "results": results
            }), 200
            
        except Exception as e:
            logger.error(f"Error decrypting election results: {str(e)}")
            return jsonify({"error": f"Decryption failed: {str(e)}"}), 500
