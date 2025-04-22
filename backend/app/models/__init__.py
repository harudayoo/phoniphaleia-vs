# models/__init__.py
from app import db  # Import the db from the app package

def init_app(app):
    # Import models after db is defined to avoid circular imports
    from .college import College
    from .organization import Organization
    from .election import Election
    from .crypto_config import CryptoConfig
    from .trusted_authority import TrustedAuthority
    from .key_share import KeyShare
    from .voter import Voter
    from .candidate import Candidate
    from .vote import Vote
    from .audit_log import AuditLog
    from .election_result import ElectionResult
   
    # Create all tables
    with app.app_context():
        db.create_all()