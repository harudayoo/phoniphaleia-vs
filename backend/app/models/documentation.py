from datetime import datetime
from app import db

class Documentation(db.Model):
    __tablename__ = 'documentation'

    doc_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), nullable=False)  # Published, Draft, Archived
    description = db.Column(db.Text)
    content = db.Column(db.Text)
    author = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    published_at = db.Column(db.DateTime)
    last_updated = db.Column(db.DateTime, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Documentation {self.title}>'
    
    def to_dict(self):
        """Convert model to dictionary for API responses"""
        return {
            'doc_id': self.doc_id,
            'title': self.title,
            'category': self.category,
            'status': self.status,
            'description': self.description,
            'content': self.content,
            'author': self.author,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }
