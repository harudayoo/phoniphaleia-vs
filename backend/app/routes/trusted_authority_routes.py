from flask import Blueprint
from app.controllers.trusted_authority_controller import TrustedAuthorityController

trusted_authority_bp = Blueprint('trusted_authority', __name__, url_prefix='/api')

from app.utils.auth import admin_required

@trusted_authority_bp.route('/trusted_authorities', methods=['POST'])
@admin_required
def create_trusted_authority():
    return TrustedAuthorityController.create_trusted_authority()
    
@trusted_authority_bp.route('/trusted_authorities/challenge', methods=['POST'])
def request_challenge():
    return TrustedAuthorityController.request_challenge()
    
@trusted_authority_bp.route('/trusted_authorities/<int:authority_id>', methods=['GET'])
@admin_required
def get_trusted_authority(authority_id):
    return TrustedAuthorityController.get_trusted_authority(authority_id)
    
@trusted_authority_bp.route('/trusted_authorities', methods=['GET'])
@admin_required
def get_all_trusted_authorities():
    return TrustedAuthorityController.get_all_trusted_authorities()
