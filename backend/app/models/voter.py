# backend/app/models/voter.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import Index, CheckConstraint
import bcrypt
import hashlib
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from ecpy.curves import Curve, Point
from ecpy.keys import ECPrivateKey
import os
import json
from typing import Optional, Dict, Any

db = SQLAlchemy()
cv = Curve.get_curve('secp256k1')

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
    id_metadata = db.Column(db.String(255))
    # Fields for ZKP authentication
    zkp_commitment = db.Column(db.String(255), nullable=False)
    zkp_salt = db.Column(db.String(32), nullable=False)
    zkp_public_key = db.Column(db.String(512), nullable=False)  # Store public key
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    validated_at = db.Column(db.DateTime)  
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
   
    # Relationships
    college = relationship("College", backref="voters")
   
    __table_args__ = (
        CheckConstraint("student_id ~ '^[0-9]{4}-[0-9]{5}$'", name='check_student_id_format'),
        Index('ix_voters_zkp_commitment', 'zkp_commitment', unique=True),
    )
    
    def set_zkp_credentials(self, student_id: str, password: str) -> None:
        """Generate secure ZKP credentials using elliptic curve cryptography"""
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
        private_key = ECPrivateKey.generate(cv)
        public_key = private_key.get_public_key()
        
        # Store public components
        self.zkp_commitment = public_key.export(compress=True).hex()
        self.zkp_public_key = json.dumps({
            'x': public_key.W.x,
            'y': public_key.W.y,
            'curve': 'secp256k1'
        })
        
        # Store private key securely (in production, use HSM or KMS)
        self._zkp_private_key = private_key

    def verify_zkp_proof(self, proof: Dict[str, Any], challenge: str) -> bool:
        """Verify a ZKP proof against this voter's credentials"""
        try:
            from app.services.zkp.verifier import ZKPVerifier
            verifier = ZKPVerifier()
            return verifier.verify_proof(
                proof=proof,
                commitment=self.zkp_commitment,
                challenge=challenge,
                public_key=json.loads(self.zkp_public_key)
            )
        except Exception as e:
            current_app.logger.error(f"ZKP verification failed: {str(e)}")
            return False