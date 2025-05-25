import bcrypt
from app import db
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm import validates
from sqlalchemy import DateTime
import random

class SuperAdmin(db.Model):
    __tablename__ = 'super_admin'

    super_admin_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    id_number = db.Column(db.String(10), nullable=False)
    lastname = db.Column(db.String(100), nullable=False)
    firstname = db.Column(db.String(100), nullable=False)
    middlename = db.Column(db.String(100))
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now(), onupdate=db.func.now())
    verified_at = db.Column(db.DateTime(timezone=True), nullable=True, comment="Timestamp when email was verified")
    otp_code = db.Column(db.String(6), nullable=True)
    otp_expires_at = db.Column(DateTime, nullable=True)
    last_login = db.Column(db.DateTime(timezone=True), nullable=True)

    @property
    def password_raw(self):
        raise AttributeError('password is not a readable attribute')

    @password_raw.setter
    def password_raw(self, password):
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        self.password = hashed.decode('utf-8')

    def verify_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))
    
    # Validation for id_number format
    @validates('id_number')
    def validate_id_number(self, key, id_number):
        import re
        if not re.match(r'^\d{4}-\d{5}$', id_number):
            raise ValueError("ID Number must be in format 0000-00000")
        return id_number

    # Validation for email format
    @validates('email')
    def validate_email(self, key, email):
        import re
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
            raise ValueError("Invalid email address format")
        return email.lower()  # store emails in lowercase

    # Timestamp update method (alternative to trigger)
    def update_timestamp(self):
        self.updated_at = datetime.utcnow()
        db.session.add(self)
        db.session.commit()

    # Helper methods
    def full_name(self):
        if self.middlename:
            return f"{self.firstname} {self.middlename} {self.lastname}"
        return f"{self.firstname} {self.lastname}"

    def generate_otp(self, length: int = 6, expires_in: int = 300) -> str:
        """Generate and set a new OTP code with expiration time"""
        import random
        import string
        
        # Generate random numeric OTP
        self.otp_code = ''.join(random.choices(string.digits, k=length))
        self.otp_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        
        # Ensure changes are added to session (commit will happen at controller level)
        db.session.add(self)
        
        return self.otp_code
    
    def verify_otp(self, otp: str) -> bool:
        """Verify the provided OTP code"""
        if not self.otp_code or not self.otp_expires_at:
            return False
            
        if datetime.utcnow() > self.otp_expires_at:
            return False
            
        if self.otp_code != otp:
            return False
            
        self.verified_at = datetime.utcnow()
        return True

    def __repr__(self):
        return f'<SuperAdmin {self.username}>'
