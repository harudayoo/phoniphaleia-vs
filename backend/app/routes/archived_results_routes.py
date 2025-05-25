from flask import Blueprint
from flask import request
from app.utils.auth import admin_required

archived_results_bp = Blueprint('archived_results', __name__, url_prefix='/api')

@archived_results_bp.route('/archived_results', methods=['GET'])
@admin_required
def get_archived_results():
    """
    Get all archived election results grouped by election.
    """
    from app.controllers.archived_results_controller import ArchivedResultsController
    return ArchivedResultsController.get_archived_results()

@archived_results_bp.route('/archived_results/<int:archive_id>/restore', methods=['POST'])
@admin_required
def restore_archived_result(archive_id):
    """
    Restore an archived result back to the election_results table.
    """
    from app.controllers.archived_results_controller import ArchivedResultsController
    return ArchivedResultsController.restore_archived_result(archive_id)

@archived_results_bp.route('/archived_results/<int:archive_id>', methods=['DELETE'])
@admin_required
def delete_archived_result(archive_id):
    """
    Permanently delete an archived result if it's older than 1 year.
    """
    from app.controllers.archived_results_controller import ArchivedResultsController
    return ArchivedResultsController.delete_archived_result(archive_id)

@archived_results_bp.route('/archived_results/archive/<int:election_id>', methods=['POST'])
@admin_required
def archive_election_result(election_id):
    """
    Archive all results for a given election_id by moving them to archived_results table.
    """
    from app.controllers.archived_results_controller import ArchivedResultsController
    return ArchivedResultsController.archive_election_result(election_id)

@archived_results_bp.route('/archived_results/election/<int:election_id>', methods=['GET'])
@admin_required
def get_archived_results_by_election(election_id):
    """
    Get all archived results for a specific election.
    """
    from app.controllers.archived_results_controller import ArchivedResultsController
    return ArchivedResultsController.get_archived_results_by_election(election_id)
