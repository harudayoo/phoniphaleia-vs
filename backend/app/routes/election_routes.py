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

@election_bp.route('/election-results', methods=['GET'])
def get_election_results():
    from app.models.election import Election
    from app.models.candidate import Candidate
    from app.models.election_result import ElectionResult
    from flask import jsonify
    results = []
    finished_elections = Election.query.filter(Election.election_status == 'Finished').all()
    for election in finished_elections:
        candidates = Candidate.query.filter_by(election_id=election.election_id).all()
        candidate_results = []
        total_votes = 0
        for cand in candidates:
            er = ElectionResult.query.filter_by(election_id=election.election_id, candidate_id=cand.candidate_id).first()
            votes = er.vote_count if er and er.vote_count is not None else 0
            total_votes += votes
            candidate_results.append({
                'name': cand.fullname,
                'votes': votes,
                'percentage': 0,  # will fill below
                'winner': False   # will fill below
            })
        max_votes = max([c['votes'] for c in candidate_results], default=0)
        for c in candidate_results:
            c['percentage'] = round((c['votes'] / total_votes) * 100, 1) if total_votes > 0 else 0
            c['winner'] = c['votes'] == max_votes and max_votes > 0
        winners = [c['name'] for c in candidate_results if c['winner']]
        winner_str = ', '.join(winners) if winners else 'No winner'
        participation_rate = getattr(election, 'participation_rate', None)
        if participation_rate is None:
            participation_rate = 0
        results.append({
            'election_id': election.election_id,
            'election_name': election.election_name,
            'organization': election.organization.org_name if election.organization else '',
            'ended_at': election.date_end.isoformat() if election.date_end else '',
            'winner': winner_str,
            'total_votes': total_votes,
            'participation_rate': participation_rate,
            'candidates': candidate_results
        })
    return jsonify(results)