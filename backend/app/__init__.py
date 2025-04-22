# app/__init__.py
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Create a single SQLAlchemy instance for the entire application
db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")
   
    # Initialize database and CORS support
    db.init_app(app)
    CORS(app)
   
    # Add a direct route for testing
    @app.route('/direct-test')
    def direct_test():
        return jsonify({"message": "Direct test route works!"})
   
    # Import models before registering blueprints
    with app.app_context():
        # Import models
        from app.models.college import College
        # Import other models as needed
        
        # Create database tables
        db.create_all()
   
    # Register blueprints
    from app.routes import main_bp
    app.register_blueprint(main_bp, url_prefix='/api')
   
    # Print registered routes for debugging
    print("\n=== REGISTERED ROUTES ===")
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint}: {rule.rule}")
    print("========================\n")
   
    return app