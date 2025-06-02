from flask import Blueprint, request
from app.controllers.election_cast_controller import ElectionCastController

election_cast_bp = Blueprint('election_cast', __name__, url_prefix='/api')

@election_cast_bp.route('/elections/<int:election_id>/candidates', methods=['GET'])
def get_candidates_by_election(election_id):
    return ElectionCastController.get_candidates_by_election(election_id)

@election_cast_bp.route('/elections/<int:election_id>/vote', methods=['POST'])
def submit_vote(election_id):
    return ElectionCastController.submit_vote(election_id)

@election_cast_bp.route('/elections/<int:election_id>/vote-check', methods=['GET', 'POST'])
def check_voter_voted(election_id):
    if request.method == 'GET':
        voter_id = request.args.get('voter_id')
    else:  # POST
        voter_id = request.json.get('voter_id') if request.json else None
    return ElectionCastController.check_voter_voted(election_id, voter_id)

@election_cast_bp.route('/elections/<int:election_id>/votes/by-voter/<student_id>', methods=['GET'])
def get_votes_by_voter(election_id, student_id):
    return ElectionCastController.get_votes_by_voter(election_id, student_id)

@election_cast_bp.route('/elections/<int:election_id>/start_voting_session', methods=['POST'])
def start_voting_session(election_id):
    return ElectionCastController.start_voting_session(election_id)

@election_cast_bp.route('/elections/<int:election_id>/leave_voting_session', methods=['POST'])
def leave_voting_session(election_id):
    return ElectionCastController.leave_voting_session(election_id)

@election_cast_bp.route('/elections/<int:election_id>/increment_voters_count', methods=['POST'])
def increment_voters_count(election_id):
    return ElectionCastController.increment_voters_count(election_id)

@election_cast_bp.route('/elections/<int:election_id>/decrement_voters_count', methods=['POST'])
def decrement_voters_count(election_id):
    return ElectionCastController.decrement_voters_count(election_id)
