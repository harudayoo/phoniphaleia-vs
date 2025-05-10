# routes/college_routes.py
from flask import Blueprint, jsonify, request
from app import db
from app.models.college import College
from app.controllers.college_controller import CollegeController

college_bp = Blueprint('college', __name__, url_prefix='/api')

@college_bp.route('/colleges', methods=['GET'])
def get_colleges_route():
    return CollegeController.get_colleges()

@college_bp.route('/colleges/<int:college_id>', methods=['GET'])
def get_college_route(college_id):
    return CollegeController.get_college(college_id)

@college_bp.route('/colleges', methods=['POST'])
def create_college_route():
    return CollegeController.create_college()

@college_bp.route('/colleges/<int:college_id>', methods=['PUT'])
def update_college_route(college_id):
    return CollegeController.update_college(college_id)

@college_bp.route('/colleges/<int:college_id>', methods=['DELETE'])
def delete_college_route(college_id):
    return CollegeController.delete_college(college_id)