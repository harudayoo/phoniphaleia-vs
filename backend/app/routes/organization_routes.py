from flask import Blueprint
from app.controllers.organization_controller import OrganizationController

organization_bp = Blueprint('organization', __name__, url_prefix='/api')

@organization_bp.route('/organizations', methods=['GET'])
def get_organizations_route():
    return OrganizationController.get_organizations()

