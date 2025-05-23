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
from app.services.crypto.shamir import reconstruct_secret, deserialize_share, next_prime
import base64
import json
import logging

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
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def reconstruct_private_key():
        """
        Reconstruct the private key from key shares using Shamir Secret Sharing.
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
            # Reconstruct secret (private key)
            secret = reconstruct_secret(shares)
            # For demo, return as base64 (in real, never expose private key!)
            return jsonify({'private_key': base64.b64encode(secret).decode()}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500    @staticmethod
    def decrypt_tally():
        """
        Decrypt the encrypted tally using the constructed private key.
        After decryption, store the vote counts in the election_results table.
        Uses only homomorphic encryption to count votes.
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
                
            # Get encrypted results
            results = ElectionResult.query.filter_by(election_id=election_id).all()
              # Reconstruct private key from the base64 encoded string
            try:
                secret_int = int(base64.b64decode(private_key_b64))
                # Parse the public key JSON and extract the n value
                public_key_data = json.loads(crypto_config.public_key)
                pubkey = paillier.PaillierPublicKey(n=int(public_key_data.get('n')))
                privkey = paillier.PaillierPrivateKey(pubkey, secret_int, secret_int)
            except Exception as e:
                logger.error(f"Failed to reconstruct private key: {e}")
                return jsonify({'error': f'Failed to reconstruct private key: {str(e)}'}), 400
            
            # Decrypt each result
            decrypted = {}
            for r in results:
                if r.encrypted_vote_total:
                    try:
                        # Create encrypted number object
                        enc_num = paillier.EncryptedNumber(pubkey, int(r.encrypted_vote_total), 0)
                        
                        # Decrypt the vote count using homomorphic encryption
                        vote_count = privkey.decrypt(enc_num)
                        
                        # Store in database
                        r.vote_count = vote_count
                        decrypted[r.candidate_id] = vote_count
                    except Exception as e:
                        logger.error(f"Error decrypting result for candidate {r.candidate_id}: {e}")
                        return jsonify({'error': f'Decryption failed for candidate {r.candidate_id}: {str(e)}'}), 500
              # Commit changes to database
            db.session.commit()
            
            # We only use homomorphic encryption for counting votes, no need for manual counting
            
            return jsonify({'decrypted_results': decrypted}), 200
        except Exception as e:
            db.session.rollback()
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
        return out    @staticmethod
    def get_all_election_results():
        """
        Return all election results, including election and organization info, matching frontend expectations.
        Only returns results from properly tallied elections stored in the ElectionResult table.
        """
        from app.models.election_result import ElectionResult
        from app.models.election import Election
        from app.models.organization import Organization
        from app.models.candidate import Candidate
        from flask import jsonify
        try:
            # Get all unique elections that have results in the ElectionResult table
            election_ids_with_results = db.session.query(ElectionResult.election_id).distinct().all()
            election_ids = [eid[0] for eid in election_ids_with_results]
            
            # Get the corresponding elections
            elections = Election.query.filter(Election.election_id.in_(election_ids)).all()
            
            results = []
            for election in elections:
                # Get all candidates for this election
                candidates = Candidate.query.filter_by(election_id=election.election_id).all()
                candidate_results = []
                total_votes = 0
                
                # Get results for each candidate
                for cand in candidates:
                    er = ElectionResult.query.filter_by(election_id=election.election_id, candidate_id=cand.candidate_id).first()
                    votes = er.vote_count if er and er.vote_count is not None else 0
                    total_votes += votes
                    candidate_results.append({
                        'name': cand.fullname,
                        'votes': votes,
                        'percentage': 0,  # will fill below
                        'winner': False   # will fill below
                    })
                
                # Calculate percentages and determine winner
                max_votes = max([c['votes'] for c in candidate_results], default=0)
                for c in candidate_results:
                    c['percentage'] = round((c['votes'] / total_votes) * 100, 1) if total_votes > 0 else 0
                    c['winner'] = c['votes'] == max_votes and max_votes > 0
                
                # Get winner names for display
                winners = [c['name'] for c in candidate_results if c['winner']]
                winner_str = ', '.join(winners) if winners else 'No winner'
                
                # Get participation rate if available
                participation_rate = getattr(election, 'participation_rate', None)
                if participation_rate is None:
                    participation_rate = 0
                
                # Add to results
                results.append({
                    'election_id': election.election_id,
                    'election_name': election.election_name,
                    'organization': election.organization.org_name if election.organization else '',
                    'ended_at': election.date_end.isoformat() if election.date_end else '',
                    'winner': winner_str,
                    'total_votes': total_votes,
                    'participation_rate': participation_rate,
                    'candidates': candidate_results
                })
            
            return jsonify(results)
        except Exception as e:
            logger.error(f"Error in get_all_election_results: {str(e)}")
            # On error, return empty results array with 200 OK
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
        return out    # We're relying solely on homomorphic encryption for vote counting, 
    # so we remove the manual vote counting method
