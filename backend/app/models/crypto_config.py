from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.orm import relationship

db = SQLAlchemy()

class CryptoConfig(db.Model):
    __tablename__ = 'crypto_configs'
    
    crypto_id = db.Column(db.Integer, primary_key=True)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.election_id'), nullable=False)
    public_key = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    election = relationship("Election", backref="crypto_config")
    
    def __repr__(self):
        return f'<CryptoConfig {self.crypto_id}>'