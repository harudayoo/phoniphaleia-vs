# routes/__init__.py
from flask import Blueprint

# Create the main blueprint
main_bp = Blueprint('main', __name__)

# Import routes to register them with the blueprint
from .auth_routes import *
from .college_routes import *