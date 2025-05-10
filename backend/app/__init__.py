from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_mail import Mail
from flask_migrate import Migrate
from dotenv import load_dotenv
import os
from datetime import timedelta  # Add this import

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
mail = Mail()
migrate = Migrate()

# Import models to register them with SQLAlchemy
from app.models import *  # Import all models

def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    
    # Session and cookie configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['SESSION_COOKIE_NAME'] = os.getenv('SESSION_COOKIE_NAME')
    app.config['SESSION_COOKIE_HTTPONLY'] = os.getenv('SESSION_COOKIE_HTTPONLY', 'True') == 'True'
    app.config['SESSION_COOKIE_SECURE'] = os.getenv('SESSION_COOKIE_SECURE', 'False') == 'True'
    app.config['SESSION_COOKIE_SAMESITE'] = os.getenv('SESSION_COOKIE_SAMESITE')
    
    # Configure session timeout
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=int(os.getenv('SESSION_TIMEOUT_MINUTES')))
    app.config['SESSION_REFRESH_EACH_REQUEST'] = os.getenv('SESSION_REFRESH_EACH_REQUEST', 'True') == 'True'

    # Mail configuration
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT'))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')
    mail.init_app(app)

    # CORS setup
    cors_origins = os.getenv("CORS_ORIGINS")
    cors_origins = [origin.strip() for origin in cors_origins.split(",")] if "," in cors_origins else [cors_origins]
    CORS(app, origins=cors_origins, supports_credentials=True)

    # Initialize database
    # Models are already imported at module level
    db.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        db.create_all()

    # Register blueprints
    from app.routes import auth_bp, college_bp, admin_bp, election_bp, user_bp, position_bp, organization_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(college_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(election_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(position_bp)
    app.register_blueprint(organization_bp)

    # Simple test route
    @app.route('/direct-test')
    def direct_test():
        return jsonify({"message": "Direct test route works!"})

    return app