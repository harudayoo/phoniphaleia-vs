from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

# Create extensions outside app factory
db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    # Improved CORS setup
    cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    if "," in cors_origins:
        cors_origins = [origin.strip() for origin in cors_origins.split(",")]
    else:
        cors_origins = [cors_origins]

    CORS(
        app,
        resources={r"/api/*": {
            "origins": cors_origins,
            "supports_credentials": True,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]
        }},
        expose_headers=["Content-Type", "X-CSRFToken"]
    )

    # Initialize database
    db.init_app(app)

    # Import models to register them with SQLAlchemy
    from app import models  # noqa: F401

    with app.app_context():
        db.create_all()

    # Register blueprints
    from app.routes import main_bp
    from app.routes.auth_routes import auth_bp
    app.register_blueprint(main_bp, url_prefix='/api')
    app.register_blueprint(auth_bp)

    # Simple test route
    @app.route('/direct-test')
    def direct_test():
        return jsonify({"message": "Direct test route works!"})

    # Print registered routes for debugging
    print("\n=== REGISTERED ROUTES ===")
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint}: {rule.rule}")
    print("========================\n")

    return app