from flask import Blueprint
from app.controllers.election_controller import ElectionController

election_bp = Blueprint('election', __name__, url_prefix='/api')

election_bp.route('/elections', methods=['GET'])(ElectionController.get_all)