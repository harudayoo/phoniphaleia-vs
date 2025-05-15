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
    date_start = db.Column(db.Date, nullable=False)
    date_end = db.Column(db.Date, nullable=False)
    voters_count = db.Column(db.Integer, default=0)
    participation_rate = db.Column(db.Float, nullable=True)
    queued_access = db.Column(db.Boolean, default=False, nullable=False)
    max_concurrent_voters = db.Column(db.Integer, nullable=True)

    # Relationships
    organization = relationship("Organization", backref="elections")
    waitlist = relationship("ElectionWaitlist", backref="election", lazy='dynamic')
    
    def __repr__(self):
        return f'<Election {self.election_name}>'

# Fix for circular import: import ElectionWaitlist at the end
from .election_waitlist import ElectionWaitlist