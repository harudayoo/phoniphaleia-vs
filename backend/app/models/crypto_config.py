from app import db
from datetime import datetime
from sqlalchemy.orm import relationship

class CryptoConfig(db.Model):
    __tablename__ = 'crypto_configs'
    crypto_id = db.Column(db.Integer, primary_key=True)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.election_id', ondelete='CASCADE'), nullable=True) # Temporarily nullable
    public_key = db.Column(db.Text, nullable=False)
    key_type = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(20), nullable=True, default='active')
    meta_data = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    election = relationship("Election", backref="crypto_config")
    
    def __repr__(self):
        return f'<CryptoConfig {self.crypto_id}>'