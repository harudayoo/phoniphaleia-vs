from flask import Blueprint
from app.controllers.election_access_controller import ElectionAccessController

election_access_bp = Blueprint('election_access', __name__, url_prefix='/api')

@election_access_bp.route('/elections/<int:election_id>/access-check', methods=['POST'])
def access_check(election_id):
    return ElectionAccessController.access_check(election_id)

@election_access_bp.route('/elections/<int:election_id>/waitlist/join', methods=['POST'])
def join_waitlist(election_id):
    return ElectionAccessController.join_waitlist(election_id)

@election_access_bp.route('/elections/<int:election_id>/waitlist/leave', methods=['POST'])
def leave_waitlist(election_id):
    return ElectionAccessController.leave_waitlist(election_id)

@election_access_bp.route('/elections/<int:election_id>/waitlist/position', methods=['GET'])
def waitlist_position(election_id):
    return ElectionAccessController.waitlist_position(election_id)

@election_access_bp.route('/elections/<int:election_id>/waitlist/next', methods=['POST'])
def next_in_waitlist(election_id):
    return ElectionAccessController.next_in_waitlist(election_id)

@election_access_bp.route('/elections/<int:election_id>/active_voters', methods=['GET'])
def get_active_voters(election_id):
    return ElectionAccessController.get_active_voters(election_id)

@election_access_bp.route('/elections/<int:election_id>/eligible_voters', methods=['GET'])
def get_eligible_voters(election_id):
    return ElectionAccessController.get_eligible_voters(election_id)

@election_access_bp.route('/elections/<int:election_id>/waitlist/status', methods=['GET'])
def get_waitlist_status(election_id):
    return ElectionAccessController.get_waitlist_status(election_id)
