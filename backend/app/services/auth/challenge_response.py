"""
Challenge-Response Authentication for trusted authorities
"""
import os
import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import json
import base64

class AuthenticationService:
    """
    Service for challenge-response authentication of trusted authorities
    """
    # Store active challenges with expiration
    _active_challenges: Dict[int, Tuple[str, datetime]] = {}
    # Time-to-live for challenges in seconds
    _challenge_ttl = 300  # 5 minutes
    
    @classmethod
    def generate_challenge(cls, authority_id: int) -> str:
        """
        Generate a random challenge for an authority
        
        Args:
            authority_id: ID of the trusted authority
            
        Returns:
            Challenge string to send to the authority
        """
        # Generate random challenge
        challenge = base64.b64encode(os.urandom(32)).decode('utf-8')
        
        # Store the challenge with expiration time
        expiration = datetime.utcnow() + timedelta(seconds=cls._challenge_ttl)
        cls._active_challenges[authority_id] = (challenge, expiration)
        
        return challenge
    
    @classmethod
    def validate_response(cls, authority_id: int, challenge: str, response: str, 
                          public_key_fingerprint: str) -> bool:
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
        # Check if this is an active challenge for this authority
        if authority_id not in cls._active_challenges:
            return False
        
        stored_challenge, expiration = cls._active_challenges[authority_id]
        
        # Check if the challenge has expired
        if datetime.utcnow() > expiration:
            # Remove expired challenge
            del cls._active_challenges[authority_id]
            return False
        
        # Check if the challenge matches
        if stored_challenge != challenge:
            return False
        
        # In a real implementation, verify the signature of the response
        # using the authority's public key
        # For this example, we just check if the response is correctly formatted
        try:
            response_data = json.loads(response)
            if "signature" not in response_data or "timestamp" not in response_data:
                return False
                
            # Check if the timestamp is recent (within 5 minutes)
            timestamp = datetime.fromisoformat(response_data["timestamp"])
            if datetime.utcnow() - timestamp > timedelta(minutes=5):
                return False
            
            # In a real implementation, verify the signature here
            # This would involve using the authority's public key to verify
            # that they signed the challenge + timestamp correctly
            # For demo purposes, we'll assume it's valid
            
            # Remove the used challenge
            del cls._active_challenges[authority_id]
            return True
            
        except (json.JSONDecodeError, ValueError, KeyError):
            return False
    
    @classmethod
    def cleanup_expired_challenges(cls) -> None:
        """
        Remove all expired challenges
        """
        now = datetime.utcnow()
        expired_ids = [
            auth_id for auth_id, (_, expiration) in cls._active_challenges.items()
            if now > expiration
        ]
        
        for auth_id in expired_ids:
            del cls._active_challenges[auth_id]
