# routes/college_routes.py
from flask import Blueprint, jsonify
from app import db
from app.models.college import College

college_bp = Blueprint('college', __name__, url_prefix='/api/college')

@college_bp.route('/colleges', methods=['GET'])
def get_colleges():
    colleges = College.query.all()
    return jsonify([{
        'college_id': college.college_id,
        'name': college.college_name
    } for college in colleges])
