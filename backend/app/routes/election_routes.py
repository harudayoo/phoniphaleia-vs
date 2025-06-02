from flask import Blueprint
from app.controllers.election_controller import ElectionController

election_bp = Blueprint('election', __name__, url_prefix='/api')

# Legacy route for backward compatibility - redirects to election results controller
@election_bp.route('/election-results', methods=['GET'])
def get_election_results():
    # Redirect to the proper election_results controller for properly tallied results
    from app.controllers.election_results_controller import ElectionResultsController
    return ElectionResultsController.get_all_election_results()

# Legacy route for getting all votes by voter (cross-election)
@election_bp.route('/votes/by-voter/<student_id>', methods=['GET'])
def get_votes_by_voter_all(student_id):
    from app.models.vote import Vote
    votes = Vote.query.filter_by(student_id=student_id).all()
    return {'votes': [
        {
            'vote_id': v.vote_id,
            'election_id': v.election_id,
            'candidate_id': v.candidate_id,
            'cast_time': v.cast_time.isoformat() if v.cast_time else None,
            'vote_status': v.vote_status
        } for v in votes
    ]}