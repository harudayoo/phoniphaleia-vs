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
    mail.init_app(app)    # CORS setup
    cors_origins = os.getenv("CORS_ORIGINS")
    cors_origins = [origin.strip() for origin in cors_origins.split(",")] if "," in cors_origins else [cors_origins]
    CORS(app, origins=cors_origins, supports_credentials=True)
    
    # Configure uploads directory for serving static files
    # Create uploads directory if it doesn't exist
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
    if not os.path.exists(os.path.join(uploads_dir, 'photos')):
        os.makedirs(os.path.join(uploads_dir, 'photos'))
    
    # Configure Flask to serve static files from the uploads directory
    app.config['UPLOADS_FOLDER'] = uploads_dir
    app.config['PHOTO_BASE_URL'] = f"{os.getenv('BACKEND_URL', 'http://localhost:5000/')}/uploads/"
    
    # Register endpoint to serve files from uploads directory
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return app.send_from_directory(uploads_dir, filename)

    # Initialize database
    # Models are already imported at module level
    db.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        db.create_all()    # Register blueprints
    from app.routes import auth_bp, college_bp, admin_bp, election_bp, user_bp, position_bp, organization_bp, trusted_authority_bp, crypto_config_bp, key_share_bp, admin_search_bp, upload_bp
    from app.routes.verification_routes import verification_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(college_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(election_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(position_bp)
    app.register_blueprint(organization_bp)
    app.register_blueprint(trusted_authority_bp)
    app.register_blueprint(crypto_config_bp)
    app.register_blueprint(key_share_bp)
    app.register_blueprint(admin_search_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(verification_bp)

    # Simple test route
    @app.route('/direct-test')
    def direct_test():
        return jsonify({"message": "Direct test route works!"})

    return app