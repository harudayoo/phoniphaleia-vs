from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.orm import relationship

db = SQLAlchemy()

class TrustedAuthority(db.Model):
    __tablename__ = 'trusted_authorities'
    
    authority_id = db.Column(db.Integer, primary_key=True)
    authority_name = db.Column(db.String(255), nullable=False)
    contact_info = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<TrustedAuthority {self.authority_name}>'