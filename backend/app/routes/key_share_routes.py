from flask import Blueprint
from app.controllers.key_share_controller import KeyShareController

key_share_bp = Blueprint('key_share', __name__, url_prefix='/api')

@key_share_bp.route('/key_shares', methods=['POST'])
def create_key_share():
    return KeyShareController.create_key_share()
