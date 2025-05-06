# routes/college_routes.py
from flask import Blueprint, jsonify, request
from app import db
from app.models.college import College
from app.controllers.college_controller import CollegeController

college_bp = Blueprint('college', __name__, url_prefix='/api')

@college_bp.route('/colleges', methods=['GET'])
def get_colleges_route():
    return CollegeController.get_colleges()