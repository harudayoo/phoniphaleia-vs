# \backend\app\models\voter.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.orm import relationship
import bcrypt
import hashlib

db = SQLAlchemy()

class Voter(db.Model):
    __tablename__ = 'voters'
   
    student_id = db.Column(db.String(10), primary_key=True)
    student_email = db.Column(db.String(255), nullable=False)
    college_id = db.Column(db.Integer, db.ForeignKey('colleges.college_id'), nullable=False)
    lastName = db.Column(db.String(100), nullable=False)
    firstName = db.Column(db.String(100), nullable=False)
    middleName = db.Column(db.String(100))
    age = db.Column(db.Integer)
    sex = db.Column(db.String(1))
    address = db.Column(db.Text)
    dateOfBirth = db.Column(db.Date)
    status = db.Column(db.String(50), nullable=False)
    program = db.Column(db.String(100))
    major = db.Column(db.String(100))
    password = db.Column(db.String(255))
    #Fields for ZKP authentication
    zkp_commitment = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    validated_at = db.Column(db.DateTime)  
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
   
    # Relationships
    college = relationship("College", backref="voters")
   
    __table_args__ = (
        db.CheckConstraint("student_id ~ '^[0-9]{4}-[0-9]{5}$'", name='check_student_id_format'),
    )
   
    def set_password(self, password):
        """Hash password and generate ZKP commitment"""
        # Hash password with bcrypt for storage
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        self.password = hashed.decode('utf-8')
        
        # Create ZKP commitment (used for zero-knowledge verification)
        self.zkp_commitment = hashlib.sha256(password_bytes).hexdigest()
    
    def check_password(self, password):
        """Verify password using bcrypt"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))
   
    def __repr__(self):
        return f'<Voter {self.student_id}: {self.lastName}, {self.firstName}>'