# routes/college_routes.py
from flask import jsonify
from app import db  # Import the db from the app package
from app.models.college import College
from app.routes import main_bp

# Register the route on the main blueprint
@main_bp.route('/colleges', methods=['GET'])
def get_colleges():
    colleges = College.query.all()
    return jsonify([{
        'college_id': college.college_id,
        'name': college.college_name  # Changed to match frontend expectations
    } for college in colleges])

@main_bp.route('/test', methods=['GET'])
def test_endpoint():
    return jsonify({
        "status": "success",
        "message": "API is working correctly!"
    })