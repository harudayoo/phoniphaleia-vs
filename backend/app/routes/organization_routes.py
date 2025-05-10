from flask import Blueprint
from app.controllers.organization_controller import OrganizationController

organization_bp = Blueprint('organization', __name__, url_prefix='/api')

@organization_bp.route('/organizations', methods=['GET'])
def get_organizations_route():
    return OrganizationController.get_organizations()

@organization_bp.route('/organizations', methods=['POST'])
def create_organization_route():
    return OrganizationController.create_organization()

@organization_bp.route('/organizations/<int:org_id>', methods=['PUT'])
def update_organization_route(org_id):
    return OrganizationController.update_organization(org_id)

@organization_bp.route('/organizations/<int:org_id>', methods=['DELETE'])
def delete_organization_route(org_id):
    return OrganizationController.delete_organization(org_id)

