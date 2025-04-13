from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.orm import relationship

db = SQLAlchemy()

class Candidate(db.Model):
    __tablename__ = 'candidates'
    
    candidate_id = db.Column(db.Integer, primary_key=True)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.election_id'), nullable=False)
    fullName = db.Column(db.String(255), nullable=False)
    party = db.Column(db.String(100))
    candidate_desc = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    election = relationship("Election", backref="candidates")
    
    def __repr__(self):
        return f'<Candidate {self.fullName}>'