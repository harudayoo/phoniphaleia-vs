from app import db
from datetime import datetime

class ElectionWaitlist(db.Model):
    __tablename__ = 'election_waitlist'
    id = db.Column(db.Integer, primary_key=True)
    election_id = db.Column(db.Integer, db.ForeignKey('elections.election_id'), nullable=False)
    voter_id = db.Column(db.String(10), db.ForeignKey('voters.student_id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='waiting')  # 'waiting', 'active', 'done'

    def __repr__(self):
        return f'<ElectionWaitlist election_id={self.election_id} voter_id={self.voter_id} status={self.status}>'
