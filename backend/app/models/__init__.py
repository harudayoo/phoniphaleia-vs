# backend/app/models/__init__.py

# Import all models explicitly
from .college import College
from .organization import Organization
from .election import Election
from .crypto_config import CryptoConfig
from .trusted_authority import TrustedAuthority
from .key_share import KeyShare
from .voter import Voter
from .position import Position
from .candidate import Candidate
from .vote import Vote
from .audit_log import AuditLog
from .election_result import ElectionResult
from .admin import Admin
from .archived_result import ArchivedResult

# Export all models for easy access
__all__ = [
    'College',
    'Organization',
    'Election',
    'CryptoConfig',
    'TrustedAuthority',
    'KeyShare',
    'Voter',
    'Position',
    'Candidate',
    'Vote',
    'AuditLog',
    'ElectionResult',
    'Admin',
    'ArchivedResult',
]