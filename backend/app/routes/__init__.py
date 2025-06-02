# routes/__init__.py

# Import routes to register them with the blueprint
from .auth_routes import auth_bp
from .college_routes import college_bp
from .admin_routes import admin_bp
from .election_routes import election_bp
from .election_access_routes import election_access_bp
from .election_cast_routes import election_cast_bp
from .election_verify_routes import election_verify_bp
from .election_review_routes import election_review_bp
from .user_routes import user_bp
from .organization_routes import organization_bp
from .position_routes import position_bp
from .trusted_authority_routes import trusted_authority_bp
from .crypto_config_routes import crypto_config_bp
from .key_share_routes import key_share_bp
from .admin_search_routes import admin_search_bp
from .upload_routes import upload_bp
from .verification_routes import verification_bp
from .election_results_routes import election_results_bp
from .archived_results_routes import archived_results_bp
from .documentation_routes import documentation_routes as documentation_bp
from .system_settings_routes import system_settings_bp
from .super_admin_routes import super_admin_bp

# Define __all__ for clarity
__all__ = [
    "auth_bp",
    "college_bp",
    "admin_bp",
    "election_bp",
    "election_access_bp",
    "election_cast_bp",
    "election_verify_bp",
    "election_review_bp",
    "user_bp",
    "organization_bp",
    "position_bp",
    "trusted_authority_bp",
    "crypto_config_bp",
    "upload_bp",
    "key_share_bp",
    "admin_search_bp",
    "verification_bp",    
    "election_results_bp",
    "archived_results_bp",
    "documentation_bp",
    "system_settings_bp",
    "super_admin_bp",
]