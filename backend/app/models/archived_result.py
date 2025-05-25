from app import db
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint, inspect
import logging

logger = logging.getLogger(__name__)

class ArchivedResult(db.Model):
    __tablename__ = 'archived_results'
    
    archive_id = db.Column(db.Integer, primary_key=True)
    result_id = db.Column(db.Integer)  # Original result_id
    election_id = db.Column(db.Integer, nullable=False)
    candidate_id = db.Column(db.Integer, nullable=False)
    encrypted_vote_total = db.Column(db.Text)
    vote_count = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    archived_at = db.Column(db.DateTime, default=datetime.utcnow)  # When it was archived
    verified = db.Column(db.Boolean, default=False, nullable=True)
    
    # Define unique constraint for the original election and candidate
    __table_args__ = (UniqueConstraint('election_id', 'candidate_id', name='unique_archived_election_candidate'),)
    
    @classmethod
    def archive_from_result(cls, result):
        """Create an archived result from an election result"""
        archived = cls(
            result_id=result.result_id,
            election_id=result.election_id,
            candidate_id=result.candidate_id,
            encrypted_vote_total=result.encrypted_vote_total,
            vote_count=result.vote_count,
            created_at=result.created_at,
            updated_at=result.updated_at,
            archived_at=datetime.utcnow(),
            verified=getattr(result, 'verified', False)
        )
        db.session.add(archived)
        return archived
    
    @classmethod
    def restore_to_result(cls, archive_id):
        """Restore an archived result back to the election_results table"""
        from app.models.election_result import ElectionResult
        
        archived = cls.query.get(archive_id)
        if not archived:
            return None, "Archived result not found"
        
        # Check if a result with this election_id and candidate_id already exists
        existing = ElectionResult.query.filter_by(
            election_id=archived.election_id, 
            candidate_id=archived.candidate_id
        ).first()
        
        if existing:
            return None, "Cannot restore: a result for this election and candidate already exists"
        
        # Create new ElectionResult
        result = ElectionResult(
            election_id=archived.election_id,
            candidate_id=archived.candidate_id,
            encrypted_vote_total=archived.encrypted_vote_total,
            vote_count=archived.vote_count,
            created_at=archived.created_at,
            updated_at=archived.updated_at
        )
        
        # Try to set verified if it exists
        try:
            result.verified = archived.verified
        except:
            pass
        
        db.session.add(result)
        
        # Mark for deletion after successful restore
        db.session.delete(archived)
        
        return result, "Successfully restored"
    
    @classmethod
    def can_be_deleted(cls, archive_id):
        """Check if an archived result can be permanently deleted (1 year retention)"""
        archived = cls.query.get(archive_id)
        if not archived:
            return False, "Archived result not found"
        
        # Check if it's been archived for at least 1 year
        one_year_ago = datetime.utcnow().replace(year=datetime.utcnow().year - 1)
        can_delete = archived.archived_at <= one_year_ago
        
        if not can_delete:
            days_left = (one_year_ago - archived.archived_at).days
            return False, f"Cannot delete until retention period ends ({abs(days_left)} days remaining)"
        
        return True, "Eligible for deletion"
    
    @classmethod
    def get_grouped_by_election(cls):
        """Get archived results grouped by election with aggregated metadata"""
        from sqlalchemy import func
        from app.models.election import Election
        from app.models.organization import Organization
        
        # Get all unique elections with their latest archive date
        elections = db.session.query(
            cls.election_id,
            func.max(cls.archived_at).label('archived_at'),
            func.count(cls.archive_id).label('result_count')
        ).group_by(cls.election_id).all()
        
        result = []
        for election_id, archived_at, result_count in elections:
            # Get election details
            election = Election.query.get(election_id)
            if not election:
                continue
                  # Get organization details if available
            org_name = None
            if election.org_id:
                org = Organization.query.get(election.org_id)
                if org:
                    org_name = org.org_name
            
            # Create result item
            result.append({
                'election_id': election_id,
                'election_name': election.election_name,
                'organization': org_name,
                'archived_at': archived_at.isoformat() if archived_at else None,
                'result_count': result_count,
                'can_delete': cls.can_be_deleted_by_election(election_id)
            })
            
        return result
    
    @classmethod
    def can_be_deleted_by_election(cls, election_id):
        """Check if all archived results for an election can be deleted"""
        one_year_ago = datetime.utcnow().replace(year=datetime.utcnow().year - 1)
        
        # Find the most recent archived result for this election
        most_recent = cls.query.filter_by(election_id=election_id).order_by(cls.archived_at.desc()).first()
        
        if not most_recent:
            return False
            
        # Can delete if the most recent archive is older than 1 year
        return most_recent.archived_at <= one_year_ago
    
    def __repr__(self):
        return f'<ArchivedResult {self.archive_id}: Election {self.election_id}, Candidate {self.candidate_id}, Archived at {self.archived_at}>'
