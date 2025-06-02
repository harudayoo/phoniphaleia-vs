from flask import Blueprint
from app.controllers.election_verify_controller import ElectionVerifyController

election_verify_bp = Blueprint('election_verify', __name__, url_prefix='/api')

@election_verify_bp.route('/elections/<int:election_id>/votes/send-receipt', methods=['POST'])
def send_vote_receipt(election_id):
    return ElectionVerifyController.send_vote_receipt(election_id)

@election_verify_bp.route('/elections/<int:election_id>/crypto-config', methods=['GET'])
def get_crypto_config(election_id):
    return ElectionVerifyController.get_crypto_config(election_id)
