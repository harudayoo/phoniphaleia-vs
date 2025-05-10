from app import db
from datetime import datetime
from sqlalchemy.orm import relationship

class Election(db.Model):
    __tablename__ = 'elections'
    
    election_id = db.Column(db.Integer, primary_key=True)
    org_id = db.Column(db.Integer, db.ForeignKey('organizations.org_id'), nullable=False)
    election_name = db.Column(db.String(255), nullable=False)
    election_desc = db.Column(db.Text)
    election_status = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    date_end = db.Column(db.Date, nullable=False)
    
    # Relationships
    organization = relationship("Organization", backref="elections")
    
    def __repr__(self):
        return f'<Election {self.election_name}>'   