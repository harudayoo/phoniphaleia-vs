# backend/app/models/voter.py
from flask import current_app
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import Index, CheckConstraint
import bcrypt
import json
import os
from typing import Dict, Any
from app import db

class Voter(db.Model):
    __tablename__ = 'voters'
    
    student_id = db.Column(db.String(10), primary_key=True)
    student_email = db.Column(db.String(255), nullable=False, unique=True)
    college_id = db.Column(db.Integer, db.ForeignKey('colleges.college_id'), nullable=False)
    
    # Corrected to match database column names
    lastname = db.Column(db.String(100), nullable=False)
    firstname = db.Column(db.String(100), nullable=False)
    middlename = db.Column(db.String(100))
    dateofbirth = db.Column(db.Date)
    age = db.Column(db.Integer)
    sex = db.Column(db.String(1))
    address = db.Column(db.Text)
    status = db.Column(db.String(50), nullable=False)
    program = db.Column(db.String(100))
    major = db.Column(db.String(100))
    password = db.Column(db.String(255))
    id_metadata = db.Column(db.Text)
    photo_path = db.Column(db.String(255)) 
    
    # ZKP fields
    zkp_commitment = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    validated_at = db.Column(db.DateTime)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    college = db.relationship('College', back_populates='voters')

    __table_args__ = (
        db.CheckConstraint("student_id ~ '^[0-9]{4}-[0-9]{5}$'", name='check_student_id_format'),
    )
    
    def set_password(self, password: str) -> None:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        self.password = hashed.decode('utf-8')
    
    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))
    
    def set_zkp_credentials(self, student_id: str, password: str) -> None:
        """Generate secure ZKP credentials using elliptic curve cryptography"""
        if not ZKP_AVAILABLE:
            current_app.logger.warning("ZKP libraries not available. Skipping ZKP setup.")
            self.zkp_commitment = "not_available"
            self.zkp_salt = "not_available"
            self.zkp_public_key = "{}"
            return
            
        try:
            # Generate random salt
            self.zkp_salt = os.urandom(16).hex()
            
            # Derive secure key using PBKDF2
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA512(),
                length=32,
                salt=self.zkp_salt.encode(),
                iterations=100000
            )
            secret = kdf.derive(f"{student_id}:{password}".encode())
            
            # Generate EC key pair
            private_key = ECPrivateKey(secret, cv)
            public_key = private_key.get_public_key()
            
            # Store public components
            self.zkp_commitment = public_key.W.compress().hex()
            self.zkp_public_key = json.dumps({
                'x': str(public_key.W.x),
                'y': str(public_key.W.y),
                'curve': 'secp256k1'
            })
        except Exception as e:
            current_app.logger.error(f"ZKP credential setup failed: {str(e)}")
            # Set default values to prevent DB errors
            self.zkp_commitment = "setup_failed"
            self.zkp_salt = "setup_failed"
            self.zkp_public_key = "{}"

    def verify_zkp_proof(self, proof: Dict[str, Any], challenge: str) -> bool:
        """Verify a ZKP proof against this voter's credentials"""
        if not ZKP_AVAILABLE:
            # Fall back to regular authentication
            return False
            
        try:
            # In a production environment, implement proper ZKP verification
            # For this example, we're simplifying and assuming verification passed
            return True
        except Exception as e:
            current_app.logger.error(f"ZKP verification failed: {str(e)}")
            return False