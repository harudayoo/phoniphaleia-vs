# routes/__init__.py

# Import routes to register them with the blueprint
from .auth_routes import auth_bp
from .college_routes import college_bp
from .admin_routes import admin_bp
from .election_routes import election_bp
from .user_routes import user_bp
from .organization_routes import organization_bp
from .position_routes import position_bp
from .trusted_authority_routes import trusted_authority_bp
from .crypto_config_routes import crypto_config_bp
from .key_share_routes import key_share_bp
from .admin_search_routes import admin_search_bp
from .upload_routes import upload_bp

# Define __all__ for clarity
__all__ = [
    "auth_bp",
    "college_bp",
    "admin_bp",
    "election_bp",
    "user_bp",
    "organization_bp",
    "position_bp",
    "trusted_authority_bp",
    "crypto_config_bp",
    "upload_bp",
    "key_share_bp",
    "admin_search_bp",
]