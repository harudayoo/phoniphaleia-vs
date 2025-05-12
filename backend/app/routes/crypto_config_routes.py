from flask import Blueprint
from app.controllers.crypto_config_controller import CryptoConfigController

crypto_config_bp = Blueprint('crypto_config', __name__, url_prefix='/api')

@crypto_config_bp.route('/crypto_configs', methods=['POST'])
def create_crypto_config():
    return CryptoConfigController.create_crypto_config()
