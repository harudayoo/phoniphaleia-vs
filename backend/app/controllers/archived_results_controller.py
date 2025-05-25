from flask import jsonify, request
from app.models.election import Election
from app.models.organization import Organization
from app.models.vote import Vote
from app.models.election_result import ElectionResult
from app.models.archived_result import ArchivedResult
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

class ArchivedResultsController:
    @staticmethod
    def archive_election_result(election_id):
        """
        Archive all results for a given election_id by moving them to archived_results table.
        """
        try:
            # Start transaction
            db.session.begin_nested()
            
            # Get all results for this election
            results = ElectionResult.query.filter_by(election_id=election_id).all()
            
            if not results:
                return jsonify({'message': f'No results found for election_id {election_id}.'}), 404
            
            # Move each result to the archived_results table
            archived_count = 0
            for result in results:
                archived = ArchivedResult.archive_from_result(result)
                archived_count += 1
                db.session.delete(result)  # Remove from original table
            
            # Commit all changes
            db.session.commit()
            
            return jsonify({
                'message': f'Successfully archived {archived_count} election result(s) for election_id {election_id}.',
                'archived_count': archived_count
            }), 200
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error archiving election results for election_id {election_id}: {str(e)}")
            return jsonify({'error': f'Failed to archive election results: {str(e)}'}), 500
    
    @staticmethod
    def get_archived_results():
        """
        Get all archived election results grouped by election.
        """
        try:
            archived_elections = ArchivedResult.get_grouped_by_election()
            return jsonify(archived_elections), 200
        except Exception as e:
            logger.error(f"Error retrieving archived results: {str(e)}")
            return jsonify({'error': f'Failed to retrieve archived results: {str(e)}'}), 500
    
    @staticmethod
    def restore_archived_result(archive_id):
        """
        Restore an archived result back to the election_results table.
        """
        try:
            # Start transaction
            db.session.begin_nested()
            
            # Restore the result
            result, message = ArchivedResult.restore_to_result(archive_id)
            
            if not result:
                db.session.rollback()
                return jsonify({'error': message}), 400
            
            # Commit all changes
            db.session.commit()
            
            return jsonify({
                'message': message,
                'restored_id': result.result_id
            }), 200
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error restoring archived result {archive_id}: {str(e)}")
            return jsonify({'error': f'Failed to restore archived result: {str(e)}'}), 500
    
    @staticmethod
    def delete_archived_result(archive_id):
        """
        Permanently delete an archived result if it's older than 1 year.
        """
        try:
            # Check if this result can be deleted (1 year retention policy)
            can_delete, message = ArchivedResult.can_be_deleted(archive_id)
            
            if not can_delete:
                return jsonify({'error': message}), 403
            
            # Delete the archived result
            archived = ArchivedResult.query.get(archive_id)
            if not archived:
                return jsonify({'error': 'Archived result not found'}), 404
                
            db.session.delete(archived)
            db.session.commit()
            
            return jsonify({
                'message': f'Permanently deleted archived result {archive_id}'
            }), 200
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting archived result {archive_id}: {str(e)}")
            return jsonify({'error': f'Failed to delete archived result: {str(e)}'}), 500
    
    @staticmethod
    def get_archived_results_by_election(election_id):
        """
        Get all archived results for a specific election.
        """
        try:
            # Get the election for context
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': 'Election not found'}), 404
                
            # Get organization info if available
            org_name = None
            if hasattr(election, 'organization') and election.organization:
                org_name = election.organization.org_name
                
            # Get archived results for this election
            archived_results = ArchivedResult.query.filter_by(election_id=election_id).all()
            
            # Get candidate information for each archived result
            from app.models.candidate import Candidate
            from app.models.position import Position
            
            results = []
            for ar in archived_results:
                candidate = Candidate.query.get(ar.candidate_id)
                position = None
                if candidate and hasattr(candidate, 'position_id'):
                    position = Position.query.get(candidate.position_id)
                
                results.append({
                    'archive_id': ar.archive_id,
                    'result_id': ar.result_id,
                    'candidate_id': ar.candidate_id,
                    'candidate_name': candidate.fullname if candidate else 'Unknown',
                    'position_name': position.position_name if position else 'Unknown',
                    'vote_count': ar.vote_count,
                    'created_at': ar.created_at.isoformat() if ar.created_at else None,
                    'archived_at': ar.archived_at.isoformat() if ar.archived_at else None,
                    'can_delete': ArchivedResult.can_be_deleted(ar.archive_id)[0]
                })
            
            return jsonify({
                'election_id': election_id,
                'election_name': election.election_name,
                'organization': org_name,
                'archived_results': results
            }), 200
            
        except Exception as e:
            logger.error(f"Error retrieving archived results for election {election_id}: {str(e)}")
            return jsonify({'error': f'Failed to retrieve archived results: {str(e)}'}), 500
