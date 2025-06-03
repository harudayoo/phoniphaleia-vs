from flask import Blueprint
from app.controllers.election_review_controller import ElectionReviewController

election_review_bp = Blueprint('election_review', __name__, url_prefix='/api')

# Election management routes
@election_review_bp.route('/elections', methods=['GET'])
def get_all_elections():
    return ElectionReviewController.get_all()

@election_review_bp.route('/elections/ongoing', methods=['GET'])
def get_ongoing_elections():
    return ElectionReviewController.get_ongoing()

@election_review_bp.route('/elections', methods=['POST'])
def create_election():
    return ElectionReviewController.create()

@election_review_bp.route('/elections/<int:election_id>', methods=['PUT'])
def update_election(election_id):
    return ElectionReviewController.update(election_id)

@election_review_bp.route('/elections/<int:election_id>', methods=['DELETE'])
def delete_election(election_id):
    return ElectionReviewController.delete(election_id)

# Candidate management routes
@election_review_bp.route('/elections/<int:election_id>/candidates', methods=['POST'])
def add_candidate(election_id):
    return ElectionReviewController.add_candidate(election_id)

@election_review_bp.route('/candidates/<int:candidate_id>', methods=['PUT'])
def edit_candidate(candidate_id):
    return ElectionReviewController.edit_candidate(candidate_id)

@election_review_bp.route('/candidates/<int:candidate_id>', methods=['DELETE'])
def delete_candidate(candidate_id):
    return ElectionReviewController.delete_candidate(candidate_id)
