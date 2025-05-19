"""
Authentication service for trusted authorities
"""
from app.services.auth.challenge_response import AuthenticationService as ChallengeResponseService
import logging

logger = logging.getLogger(__name__)

class AuthenticationService:
    """
    Service for authentication of trusted authorities
    """
    
    @staticmethod
    def generate_challenge(authority_id):
        """
        Generate a random challenge for an authority
        
        Args:
            authority_id: ID of the trusted authority
            
        Returns:
            Challenge string to send to the authority
        """
        return ChallengeResponseService.generate_challenge(authority_id)
        
    @staticmethod
    def validate_response(authority_id, challenge, response, public_key_fingerprint):
        """
        Validate a challenge response from an authority
        
        Args:
            authority_id: ID of the trusted authority
            challenge: The original challenge string
            response: The response from the authority
            public_key_fingerprint: SHA-256 hash of the authority's public key
            
        Returns:
            True if the response is valid, False otherwise
        """
        return ChallengeResponseService.validate_response(
            authority_id=authority_id,
            challenge=challenge,
            response=response,
            public_key_fingerprint=public_key_fingerprint
        )
        
    @staticmethod
    def cleanup_expired_challenges():
        """
        Remove all expired challenges
        """
        ChallengeResponseService.cleanup_expired_challenges()
