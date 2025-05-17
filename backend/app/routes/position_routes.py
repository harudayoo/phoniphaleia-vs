from flask import Blueprint
from app.controllers.position_controller import PositionController

position_bp = Blueprint('position', __name__, url_prefix='/api')

@position_bp.route('/positions', methods=['GET'])
def get_positions_route():
    return PositionController.get_positions()

@position_bp.route('/positions', methods=['POST'])
def create_position_route():
    return PositionController.create_position()

@position_bp.route('/positions/<int:position_id>', methods=['PUT'])
def update_position_route(position_id):
    return PositionController.update_position(position_id)

@position_bp.route('/positions/<int:position_id>', methods=['DELETE'])
def delete_position_route(position_id):
    return PositionController.delete_position(position_id)

@position_bp.route('/positions/by-election/<int:election_id>', methods=['GET'])
def get_positions_by_election_route(election_id):
    from app.controllers.position_controller import PositionController
    return PositionController.get_positions_by_election(election_id)

