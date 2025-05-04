from app import db
from datetime import datetime
from sqlalchemy.orm import relationship

class ElectionResult(db.Model):
    __tablename__ = 'election_results'
    
    result_id = db.Column(db.Integer, primary_key=True)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.election_id'), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.candidate_id'), nullable=False)
    encrypted_vote_total = db.Column(db.Text)
    vote_count = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    election = relationship("Election", backref="election_results")
    candidate = relationship("Candidate", backref="election_results")
    
    def __repr__(self):
        return f'<ElectionResult {self.result_id}>'