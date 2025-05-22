from app import db
from datetime import datetime
from sqlalchemy.orm import relationship

class Vote(db.Model):
    __tablename__ = 'votes'
    
    vote_id = db.Column(db.Integer, primary_key=True)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.election_id'), nullable=False)
    student_id = db.Column(db.String(10), db.ForeignKey('voters.student_id'), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.candidate_id'), nullable=False)
    encrypted_vote = db.Column(db.Text, nullable=False)
    zkp_proof = db.Column(db.String(32), nullable=True, comment='Status: e.g., verified, failed')
    verification_receipt = db.Column(db.String(32), nullable=True, comment='Status: e.g., sent, not_sent')
    cast_time = db.Column(db.DateTime, default=datetime.utcnow)
    vote_status = db.Column(db.String(50), nullable=False)
    
    # Relationships
    election = relationship("Election", backref="votes")
    voter = relationship("Voter", backref="votes")
    candidate = relationship("Candidate", backref="votes")
    
    def __repr__(self):
        return f'<Vote {self.vote_id}>'