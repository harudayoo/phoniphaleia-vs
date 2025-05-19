"""
Routes for ZKP verification and vote decryption
"""
from flask import Blueprint
from app.controllers.verification_controller import VerificationController
from app.utils.auth import admin_required, trusted_authority_required

verification_bp = Blueprint('verification', __name__, url_prefix='/api/verification')

# ZKP verification routes
verification_bp.route('/verify', methods=['POST'])(
    VerificationController.verify_vote_zkp
)

# Verification key endpoint
verification_bp.route('/key', methods=['GET'])(
    VerificationController.get_verification_key
)

# Authority verification route
verification_bp.route('/verify-authority', methods=['POST'])(
    VerificationController.verify_authority
)

# Vote decryption routes - requiring admin or trusted authority authorization
verification_bp.route('/decrypt/vote', methods=['POST'])(
    admin_required(VerificationController.decrypt_vote)
)

verification_bp.route('/decrypt/submit-partial', methods=['POST'])(
    trusted_authority_required(VerificationController.submit_partial_decryption)
)

verification_bp.route('/decrypt/election-results', methods=['POST'])(
    admin_required(VerificationController.decrypt_election_results)
)
