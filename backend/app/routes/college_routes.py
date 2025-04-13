# routes/colleges.py
from flask import Blueprint, jsonify
from app.models.college import College

colleges_bp = Blueprint('colleges', __name__)

@colleges_bp.route('/api/colleges', methods=['GET'])
def get_colleges():
    colleges = College.query.all()
    return jsonify([{
        'college_id': college.college_id,
        'name': college.college_name
    } for college in colleges])