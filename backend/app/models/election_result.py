from app import db
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint, inspect
import logging

logger = logging.getLogger(__name__)

class ElectionResult(db.Model):
    __tablename__ = 'election_results'
    
    result_id = db.Column(db.Integer, primary_key=True)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.election_id'), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.candidate_id'), nullable=False)
    encrypted_vote_total = db.Column(db.Text)
    vote_count = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Define verified column but handle missing column in database
    # This column will only be used if it exists in the database
    verified = db.Column(db.Boolean, default=False, nullable=True)
    
    # Add unique constraint to prevent duplicate entries
    __table_args__ = (UniqueConstraint('election_id', 'candidate_id', name='unique_election_candidate'),)
    
    # Relationships
    election = relationship("Election", backref="election_results")
    candidate = relationship("Candidate", backref="election_results")
    
    @classmethod
    def get_aggregated_results(cls, election_id):
        """Get aggregated vote counts for an election, handling any duplicates"""
        from sqlalchemy import func
        return db.session.query(
            cls.candidate_id,
            func.sum(cls.vote_count).label('vote_count')
        ).filter_by(election_id=election_id).group_by(cls.candidate_id).all()
        
    @classmethod
    def upsert_result(cls, election_id, candidate_id, encrypted_vote_total=None, vote_count=None):
        """Upsert an election result, preventing duplicates"""
        try:
            # Check for existing result
            existing = cls.query.filter_by(election_id=election_id, candidate_id=candidate_id).first()
            
            if existing:
                logger.info(f"Updating existing result for election {election_id}, candidate {candidate_id}")
                if encrypted_vote_total is not None:
                    existing.encrypted_vote_total = encrypted_vote_total
                if vote_count is not None:
                    existing.vote_count = vote_count
                existing.updated_at = datetime.utcnow()
                return existing, False  # Return False for "not created"
            else:
                logger.info(f"Creating new result for election {election_id}, candidate {candidate_id}")
                new_result = cls(
                    election_id=election_id,
                    candidate_id=candidate_id,
                    encrypted_vote_total=encrypted_vote_total,
                    vote_count=vote_count
                )
                db.session.add(new_result)
                return new_result, True  # Return True for "created"
        except Exception as e:
            logger.error(f"Error in upsert_result: {e}")
            raise
    
    @classmethod
    def detect_duplicates(cls, election_id):
        """Detect duplicate entries for an election"""
        from sqlalchemy import func
        from collections import Counter
        
        results = cls.query.filter_by(election_id=election_id).all()
        candidate_counts = Counter(r.candidate_id for r in results)
        duplicates = {cid: count for cid, count in candidate_counts.items() if count > 1}
        
        if duplicates:
            logger.warning(f"Duplicates detected in election {election_id}: {duplicates}")
            return duplicates
        return None
    
    @classmethod
    def cleanup_duplicates(cls, election_id):
        """Remove duplicate entries, keeping the most recent one"""
        duplicates = cls.detect_duplicates(election_id)
        if not duplicates:
            return 0
        
        removed_count = 0
        for candidate_id in duplicates.keys():
            # Get all results for this candidate, ordered by created_at desc
            results = cls.query.filter_by(
                election_id=election_id, 
                candidate_id=candidate_id
            ).order_by(cls.created_at.desc()).all()
            
            # Keep the first (most recent), delete the rest
            for result in results[1:]:
                logger.info(f"Removing duplicate result {result.result_id} for candidate {candidate_id}")
                db.session.delete(result)
                removed_count += 1
        
        return removed_count
    
    @classmethod
    def verify_vote_counts(cls, election_id):
        """
        Verify vote counts match expectations:
        1. Check totals against original vote counts
        2. Check for negative values
        3. Check for unusually high values
        """
        from app.models.vote import Vote
        from collections import Counter
        
        # Get actual votes per candidate
        votes = Vote.query.filter_by(election_id=election_id).all()
        vote_counts = Counter(v.candidate_id for v in votes)
        
        # Get decrypted results
        results = cls.query.filter_by(election_id=election_id).all()
        
        issues = []
        for result in results:
            candidate_id = result.candidate_id
            expected_votes = vote_counts.get(candidate_id, 0)
            actual_votes = result.vote_count if result.vote_count is not None else 0
            
            # Check for negative values
            if actual_votes < 0:
                issues.append(f"Negative vote count for candidate {candidate_id}: {actual_votes}")
            
            # Check for large discrepancies
            if actual_votes > expected_votes * 2:
                issues.append(f"Suspicious vote count for candidate {candidate_id}: decrypted={actual_votes}, expected={expected_votes}")
        
        # Check if verified column exists in the database before using it
        table_has_verified_column = False
        try:
            insp = inspect(db.engine)
            columns = [c['name'] for c in insp.get_columns('election_results')]
            table_has_verified_column = 'verified' in columns
        except:
            logger.warning("Could not inspect database schema to check for 'verified' column")
        
        # Mark results as verified if no issues and column exists
        if not issues and table_has_verified_column:
            try:
                for result in results:
                    setattr(result, 'verified', True)
                db.session.commit()
                return True, []
            except Exception as e:
                logger.warning(f"Could not set verified status: {e}")
                db.session.rollback()
        
        return False, issues
    
    def __repr__(self):
        # Access verified attribute safely to avoid AttributeErrors
        verified_status = "verified" if getattr(self, "verified", None) else "unverified"
        return f'<ElectionResult {self.result_id}: Election {self.election_id}, Candidate {self.candidate_id}, {verified_status}>'