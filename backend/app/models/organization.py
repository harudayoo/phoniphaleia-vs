from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.orm import relationship

db = SQLAlchemy()

class Organization(db.Model):
    __tablename__ = 'organizations'
    
    org_id = db.Column(db.Integer, primary_key=True)
    college_id = db.Column(db.Integer, db.ForeignKey('colleges.college_id'), nullable=True)
    org_name = db.Column(db.String(255), nullable=False)
    org_desc = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    college = relationship("College", backref="organizations")
    
    def __repr__(self):
        return f'<Organization {self.org_name}>'