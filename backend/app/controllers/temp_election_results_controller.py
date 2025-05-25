from flask import jsonify, request
from app.models.election import Election
from app.models.organization import Organization
from app.models.vote import Vote
from app.models.election_result import ElectionResult
from app.models.crypto_config import CryptoConfig
from app.models.key_share import KeyShare
from app.models.trusted_authority import TrustedAuthority
from app.models.candidate import Candidate
from app.models.position import Position
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
    # Keep all existing code
    
    @staticmethod
    def get_election_result(result_id):
        """
        Get a single election result by result_id
        Returns detailed information about a specific election result.
        """
        try:
            # Get the election result
            result = ElectionResult.query.get(result_id)
            if not result:
                return jsonify({'error': 'Election result not found'}), 404
            
            # Get related data
            election = Election.query.get(result.election_id)
            if not election:
                return jsonify({'error': 'Related election not found'}), 404
                
            organization = Organization.query.get(election.org_id) if election.org_id else None
            
            # Get all results for this election to calculate statistics and identify winners
            all_election_results = ElectionResult.query.filter_by(election_id=result.election_id).all()
            candidates = Candidate.query.filter_by(election_id=result.election_id).all()
            positions = Position.query.filter_by(org_id=election.org_id).all()
            
            # Group candidates by position
            pos_to_candidates = {}
            for cand in candidates:
                pos_to_candidates.setdefault(cand.position_id, []).append(cand)
            
            # Calculate total votes and prepare candidate results
            total_votes = sum([r.vote_count or 0 for r in all_election_results])
            voters_count = election.voter_count or 0
            participation_rate = (total_votes / voters_count * 100) if voters_count > 0 else 0
            
            candidate_results = []
            for pos in positions:
                cands = pos_to_candidates.get(pos.position_id, [])
                if not cands:
                    continue
                
                # Get vote counts for each candidate in this position
                position_cands = []
                position_total = 0
                for cand in cands:
                    er = next((r for r in all_election_results if r.candidate_id == cand.candidate_id), None)
                    votes = er.vote_count if er and er.vote_count is not None else 0
                    position_total += votes
                    position_cands.append({
                        'id': cand.candidate_id,
                        'name': cand.fullname,
                        'votes': votes,
                        'percentage': 0,  # will calculate below
                        'winner': False,  # will determine below
                        'position_id': pos.position_id,
                        'position_name': pos.position_name
                    })
                
                # Calculate percentages and determine winner for this position
                if position_cands:
                    max_votes = max([c['votes'] for c in position_cands])
                    for c in position_cands:
                        c['percentage'] = round((c['votes'] / position_total * 100), 1) if position_total > 0 else 0
                        if c['votes'] == max_votes:
                            c['winner'] = True
                    
                    candidate_results.extend(position_cands)
            
            # Format the response
            result_detail = {
                'result_id': result.result_id,
                'election_id': election.election_id,
                'election_name': election.election_name,
                'organization': {'org_name': organization.org_name} if organization else None,
                'status': election.status,
                'published_at': election.created_at.isoformat() if election.created_at else None,
                'description': election.description,
                'participation_rate': round(participation_rate, 1),
                'voters_count': voters_count,
                'total_votes': total_votes,
                'crypto_enabled': True if election.encryption_enabled else False,
                'threshold_crypto': True if election.threshold_encryption_enabled else False,
                'zkp_verified': True if result.zkp_verified else False,
                'candidates': candidate_results
            }
            
            return jsonify(result_detail)
            
        except Exception as e:
            logger.error(f"Error in get_election_result: {str(e)}\n{traceback.format_exc()}")
            return jsonify({'error': f'Internal server error: {str(e)}'}), 500
    
    # Keep all other existing methods
