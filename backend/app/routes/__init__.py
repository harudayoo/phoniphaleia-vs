# routes/__init__.py
from flask import Blueprint

# Create the main blueprint
main_bp = Blueprint('main', __name__)

# Import routes to register them with the blueprint
from .auth_routes import auth_bp
from .college_routes import college_bp
from .admin_routes import admin_bp
from .election_routes import election_bp

# Define __all__ for clarity
__all__ = [
    "auth_bp",
    "college_bp",
    "admin_bp",
    "election_bp",
]