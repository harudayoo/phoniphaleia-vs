from flask import Blueprint
from app.controllers.position_controller import PositionController

position_bp = Blueprint('position', __name__, url_prefix='/api')

@position_bp.route('/positions', methods=['GET'])
def get_positions_route():
    return PositionController.get_positions()

