# backend/app/models/__init__.py

# Explicitly import all models
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
from .admin import Admin

__all__ = [
    'College',
    'Organization',
    'Election',
    'CryptoConfig',
    'TrustedAuthority',
    'KeyShare',
    'Voter',
    'Candidate',
    'Vote',
    'AuditLog',
    'ElectionResult',
    'Admin'
]