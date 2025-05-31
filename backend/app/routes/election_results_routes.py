from flask import Blueprint, request, jsonify
from app.controllers.election_results_controller import ElectionResultsController

election_results_bp = Blueprint('election_results', __name__, url_prefix='/api')

@election_results_bp.route('/election_results/tally', methods=['POST'])
def tally_election():
    return ElectionResultsController.tally_election()

@election_results_bp.route('/election_results/<int:election_id>/authorities', methods=['GET'])
def get_trusted_authorities(election_id):
    return ElectionResultsController.get_trusted_authorities(election_id)

@election_results_bp.route('/election_results/reconstruct', methods=['POST'])
def reconstruct_private_key():
    return ElectionResultsController.reconstruct_private_key()

@election_results_bp.route('/election_results/decrypt', methods=['POST'])
def decrypt_tally():
    return ElectionResultsController.decrypt_tally()

@election_results_bp.route('/election_results/<int:election_id>/decrypted', methods=['GET'])
def get_decrypted_results(election_id):
    return ElectionResultsController.get_decrypted_results(election_id)

@election_results_bp.route('/election_results/<int:election_id>/pdf', methods=['GET'])
def export_pdf_report(election_id):
    return ElectionResultsController.get_pdf_data(election_id)

@election_results_bp.route('/election_results/<int:election_id>', methods=['GET'])
def get_election_result(election_id):
    return ElectionResultsController.get_election_results_by_election_id(election_id)

@election_results_bp.route('/election_results', methods=['GET'])
def get_all_election_results():
    return ElectionResultsController.get_all_election_results()

@election_results_bp.route('/election_results/ongoing', methods=['GET'])
def get_ongoing_election_results():
    return ElectionResultsController.get_ongoing_elections_results()

@election_results_bp.route('/elections/ongoing', methods=['GET'])
def get_ongoing_elections_for_modal():
    out = ElectionResultsController.get_ongoing_elections_for_modal()
    return jsonify(out), 200

@election_results_bp.route('/debug/election-results', methods=['GET'])
def debug_election_results():
    """
    DEBUG ONLY: Show the raw contents of the ElectionResult table.
    """
    from app.models.election_result import ElectionResult
    from app.models.candidate import Candidate
    from app.models.election import Election
    from flask import jsonify
    
    results = ElectionResult.query.all()
    output = []
    
    for r in results:
        candidate = Candidate.query.get(r.candidate_id) if r.candidate_id else None
        election = Election.query.get(r.election_id) if r.election_id else None
        
        output.append({
            'result_id': r.result_id,
            'election_id': r.election_id,
            'election_name': election.election_name if election else 'Unknown',
            'candidate_id': r.candidate_id,
            'candidate_name': candidate.fullname if candidate else 'Unknown',
            'vote_count': r.vote_count,
            'has_encrypted_total': bool(r.encrypted_vote_total),
            'created_at': r.created_at.isoformat() if r.created_at else None,
            'updated_at': r.updated_at.isoformat() if r.updated_at else None
        })
    
    return jsonify(output)

@election_results_bp.route('/election_results/<int:election_id>', methods=['DELETE'])
def delete_election_result(election_id):
    from app.controllers.election_results_controller import ElectionResultsController
    return ElectionResultsController.delete_election_result(election_id)

@election_results_bp.route('/election_results/fix-verification', methods=['POST'])
def fix_verification_status():
    """
    Fix the verification status of election results.
    
    Request body (optional):
    {
        "election_id": 123  // Specific election to fix, omit to fix all
    }
    """
    data = request.get_json() or {}
    election_id = data.get('election_id')
    return ElectionResultsController.fix_verification_status(election_id)
