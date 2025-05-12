from flask import Blueprint
from app.controllers.election_controller import ElectionController

election_bp = Blueprint('election', __name__, url_prefix='/api')

election_bp.route('/elections', methods=['GET'])(ElectionController.get_all)

@election_bp.route('/elections', methods=['POST'])
def create_election():
    return ElectionController.create()

@election_bp.route('/elections/<int:election_id>', methods=['PUT'])
def update_election(election_id):
    return ElectionController.update(election_id)

@election_bp.route('/elections/<int:election_id>', methods=['DELETE'])
def delete_election(election_id):
    return ElectionController.delete(election_id)