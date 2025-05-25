import bcrypt
from app import db
from datetime import datetime, timedelta
from sqlalchemy.orm import validates
from sqlalchemy import DateTime
import random

class PendingAdmin(db.Model):
    __tablename__ = 'pending_admin'

    pending_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False)
    id_number = db.Column(db.String(10), nullable=False)
    lastname = db.Column(db.String(100), nullable=False)
    firstname = db.Column(db.String(100), nullable=False)
    middlename = db.Column(db.String(100))
    username = db.Column(db.String(50), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now(), onupdate=db.func.now())
    notes = db.Column(db.Text, nullable=True)  # For rejection reasons or other notes

    @property
    def password_raw(self):
        raise AttributeError('password is not a readable attribute')

    @password_raw.setter
    def password_raw(self, password):
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        self.password = hashed.decode('utf-8')

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

    # Helper methods
    def full_name(self):
        if self.middlename:
            return f"{self.firstname} {self.middlename} {self.lastname}"
        return f"{self.firstname} {self.lastname}"

    def to_dict(self):
        return {
            'pending_id': self.pending_id,
            'email': self.email,
            'id_number': self.id_number,
            'lastname': self.lastname,
            'firstname': self.firstname,
            'middlename': self.middlename,
            'username': self.username,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'notes': self.notes,
            'full_name': self.full_name()
        }

    def __repr__(self):
        return f'<PendingAdmin {self.username}>'
