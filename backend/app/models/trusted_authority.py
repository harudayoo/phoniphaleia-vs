from app import db
from datetime import datetime
from sqlalchemy.orm import relationship

class TrustedAuthority(db.Model):
    __tablename__ = 'trusted_authorities'
    
    authority_id = db.Column(db.Integer, primary_key=True)
    authority_name = db.Column(db.String(255), nullable=False)
    contact_info = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # This field is not part of the database schema but is used programmatically
    # to associate authorities with elections when creating new authorities
    election_id = None
    
    def __repr__(self):
        return f'<TrustedAuthority {self.authority_name}>'