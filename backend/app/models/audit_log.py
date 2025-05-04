from app import db
from datetime import datetime
from sqlalchemy.orm import relationship

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    log_id = db.Column(db.Integer, primary_key=True)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.election_id'), nullable=False)
    student_id = db.Column(db.String(10), db.ForeignKey('voters.student_id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text)
    log_time = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    election = relationship("Election", backref="audit_logs")
    voter = relationship("Voter", backref="audit_logs", foreign_keys=[student_id])
    
    def __repr__(self):
        return f'<AuditLog {self.log_id}: {self.action}>'