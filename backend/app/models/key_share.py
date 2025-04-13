from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.orm import relationship

db = SQLAlchemy()

class KeyShare(db.Model):
    __tablename__ = 'key_shares'
    
    key_share_id = db.Column(db.Integer, primary_key=True)
    crypto_id = db.Column(db.Integer, db.ForeignKey('crypto_configs.crypto_id'), nullable=False)
    authority_id = db.Column(db.Integer, db.ForeignKey('trusted_authorities.authority_id'), nullable=False)
    share_value = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    crypto_config = relationship("CryptoConfig", backref="key_shares")
    trusted_authority = relationship("TrustedAuthority", backref="key_shares")
    
    def __repr__(self):
        return f'<KeyShare {self.key_share_id}>'