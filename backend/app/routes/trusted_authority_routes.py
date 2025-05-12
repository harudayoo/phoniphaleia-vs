from flask import Blueprint
from app.controllers.trusted_authority_controller import TrustedAuthorityController

trusted_authority_bp = Blueprint('trusted_authority', __name__, url_prefix='/api')

@trusted_authority_bp.route('/trusted_authorities', methods=['POST'])
def create_trusted_authority():
    return TrustedAuthorityController.create_trusted_authority()
