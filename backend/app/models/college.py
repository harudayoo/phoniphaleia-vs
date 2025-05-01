# models/college.py
from app import db
from datetime import datetime
from sqlalchemy.orm import relationship

class College(db.Model):
    __tablename__ = 'colleges'
   
    college_id = db.Column(db.Integer, primary_key=True)
    college_name = db.Column(db.String(255), nullable=False)
    college_desc = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    voters = db.relationship('Voter', back_populates='college')
   
    def __repr__(self):
        return f'<College {self.college_name}>'