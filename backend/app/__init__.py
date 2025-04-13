# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")
    
    # Initialize database and CORS support
    db.init_app(app)
    CORS(app)
    
    # Register blueprints
    from app.routes.route import main as main_blueprint
    app.register_blueprint(main_blueprint)
    
    return app