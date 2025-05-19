from flask import Blueprint, request
from app.controllers.election_controller import ElectionController

election_bp = Blueprint('election', __name__, url_prefix='/api')

election_bp.route('/elections', methods=['GET'])(ElectionController.get_all)

@election_bp.route('/elections/ongoing', methods=['GET'])
def get_ongoing_elections():
    return ElectionController.get_ongoing()

@election_bp.route('/elections', methods=['POST'])
def create_election():
    return ElectionController.create()

@election_bp.route('/elections/<int:election_id>', methods=['PUT'])
def update_election(election_id):
    return ElectionController.update(election_id)

@election_bp.route('/elections/<int:election_id>', methods=['DELETE'])
def delete_election(election_id):
    return ElectionController.delete(election_id)

@election_bp.route('/elections/<int:election_id>/waitlist/join', methods=['POST'])
def join_waitlist(election_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.join_waitlist(election_id)

@election_bp.route('/elections/<int:election_id>/waitlist/leave', methods=['POST'])
def leave_waitlist(election_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.leave_waitlist(election_id)

@election_bp.route('/elections/<int:election_id>/waitlist/position', methods=['GET'])
def waitlist_position(election_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.waitlist_position(election_id)

@election_bp.route('/elections/<int:election_id>/waitlist/next', methods=['POST'])
def next_in_waitlist(election_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.next_in_waitlist(election_id)

@election_bp.route('/elections/<int:election_id>/active_voters', methods=['GET'])
def get_active_voters(election_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.get_active_voters(election_id)

@election_bp.route('/elections/<int:election_id>/eligible_voters', methods=['GET'])
def get_eligible_voters(election_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.get_eligible_voters(election_id)

@election_bp.route('/elections/<int:election_id>/access-check', methods=['POST'])
def access_check(election_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.access_check(election_id)

@election_bp.route('/elections/<int:election_id>/candidates', methods=['GET'])
def get_candidates_by_election(election_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.get_candidates_by_election(election_id)

@election_bp.route('/elections/<int:election_id>/candidates', methods=['POST'])
def add_candidate(election_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.add_candidate(election_id)

@election_bp.route('/candidates/<int:candidate_id>', methods=['PUT'])
def edit_candidate(candidate_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.edit_candidate(candidate_id)

@election_bp.route('/candidates/<int:candidate_id>', methods=['DELETE'])
def delete_candidate(candidate_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.delete_candidate(candidate_id)

@election_bp.route('/elections/<int:election_id>/vote', methods=['POST'])
def submit_vote(election_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.submit_vote(election_id)

@election_bp.route('/elections/<int:election_id>/vote-check', methods=['GET', 'POST'])
def check_voter_voted(election_id):
    if request.method == 'GET':
        voter_id = request.args.get('voter_id')
    else:  # POST
        voter_id = request.json.get('voter_id') if request.json else None
    return ElectionController.check_voter_voted(election_id, voter_id)

@election_bp.route('/elections/<int:election_id>/votes/by-voter/<student_id>', methods=['GET'])
def get_votes_by_voter(election_id, student_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.get_votes_by_voter(election_id, student_id)

@election_bp.route('/elections/<int:election_id>/votes/send-receipt', methods=['POST'])
def send_vote_receipt(election_id):
    from app.controllers.election_controller import ElectionController
    return ElectionController.send_vote_receipt(election_id)