from app import db
from datetime import datetime
from sqlalchemy.orm import relationship

class Candidate(db.Model):
    __tablename__ = 'candidates'
    
    candidate_id = db.Column(db.Integer, primary_key=True)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.election_id'), nullable=False)
    fullname = db.Column(db.String(255), nullable=False)  # fixed from fullName to fullname
    position_id = db.Column(db.Integer, db.ForeignKey('positions.position_id'), nullable=True)
    party = db.Column(db.String(100))
    candidate_desc = db.Column(db.String(255))
    photo_path = db.Column(db.String(255))  # Path to stored candidate photo
    photo_metadata = db.Column(db.Text)  # Store metadata about the photo
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    election = relationship("Election", backref="candidates")
    position = relationship("Position", backref="candidates")
    def __repr__(self):
        return f'<Candidate {self.fullname}>'