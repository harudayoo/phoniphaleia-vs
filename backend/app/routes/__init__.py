from flask import Blueprint

# Create the main routes blueprint
main_bp = Blueprint('main', __name__)

# Import routes after blueprint creation to avoid circular imports
from .auth_routes import *
from .college_routes import *
#from .voter_routes import *
#from .admin_routes import *
#from .audit_routes import *

# Register other route modules if needed
# Import route modules here

def init_routes(app):
    """Initialize all route blueprints with the Flask app"""
    app.register_blueprint(main_bp, url_prefix='/api')
