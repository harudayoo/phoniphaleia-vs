#!/usr/bin/env python3
"""
Integration test for challenge-response authentication in the verification system
"""

import requests
import json
import time
import hashlib
import hmac
import base64
import os
import sys
import datetime

# Configuration
API_URL = "http://localhost:5000/api"
AUTHORITY_ID = 1  # Update with a valid trusted authority ID


def generate_keypair():
    """
    Generate a mock keypair for testing
    In a real implementation, this would use proper cryptographic libraries
    """
    # Generate a random "private key" for testing
    private_key = base64.b64encode(os.urandom(32)).decode('utf-8')
    
    # Generate a fingerprint of this key
    fingerprint = hashlib.sha256(private_key.encode()).hexdigest()
    
    return private_key, fingerprint


def sign_challenge(challenge, private_key):
    """
    Sign a challenge with a private key
    In a real implementation, this would use proper cryptographic signing
    """
    # Current timestamp in ISO format
    timestamp = datetime.datetime.utcnow().isoformat()
    
    # Data to sign: challenge + timestamp
    data_to_sign = f"{challenge}:{timestamp}"
    
    # Create a signature using HMAC-SHA256 (just for demonstration)
    signature = hmac.new(
        private_key.encode(),
        data_to_sign.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Return the response data
    return {
        "signature": signature,
        "timestamp": timestamp
    }


def test_challenge_response():
    """
    Test the challenge-response authentication flow
    """
    print("\n======= Challenge-Response Authentication Test =======\n")
    
    # Step 1: Generate a keypair
    print("Generating keypair...")
    private_key, fingerprint = generate_keypair()
    print(f"Private Key (first 10 chars): {private_key[:10]}...")
    print(f"Public Key Fingerprint: {fingerprint}")
    
    # Step 2: Request a challenge
    print("\nRequesting challenge from server...")
    challenge_url = f"{API_URL}/trusted_authorities/challenge"
    challenge_response = requests.post(
        challenge_url,
        json={"authorityId": AUTHORITY_ID}
    )
    
    if not challenge_response.ok:
        print(f"Failed to get challenge: {challenge_response.text}")
        return False
    
    challenge_data = challenge_response.json()
    challenge = challenge_data.get("challenge")
    expires_in = challenge_data.get("expiresIn", 300)
    
    print(f"Received challenge: {challenge[:20]}...")
    print(f"Challenge expires in: {expires_in} seconds")
    
    # Step 3: Sign the challenge
    print("\nSigning challenge...")
    response_data = sign_challenge(challenge, private_key)
    print(f"Generated signature: {response_data['signature'][:20]}...")
    print(f"Timestamp: {response_data['timestamp']}")
    
    # Step 4: Verify the authority
    print("\nSending verification request...")
    verify_url = f"{API_URL}/verification/verify-authority"
    verify_payload = {
        "authorityId": AUTHORITY_ID,
        "challenge": challenge,
        "response": json.dumps(response_data),
        "publicKeyFingerprint": fingerprint
    }
    
    verify_response = requests.post(verify_url, json=verify_payload)
    
    if not verify_response.ok:
        print(f"Verification request failed: {verify_response.text}")
        return False
    
    verify_result = verify_response.json()
    is_valid = verify_result.get("valid", False)
    
    if is_valid:
        print("\n✅ Challenge-response authentication successful!")
    else:
        print("\n❌ Challenge-response authentication failed!")
    
    return is_valid


def test_partial_decryption_auth():
    """
    Test submitting a partial decryption with authentication
    """
    print("\n======= Authenticated Partial Decryption Test =======\n")
    
    # Step 1: Generate a keypair
    print("Generating keypair...")
    private_key, fingerprint = generate_keypair()
    
    # Step 2: Request a challenge
    print("Requesting challenge...")
    challenge_url = f"{API_URL}/trusted_authorities/challenge"
    challenge_response = requests.post(
        challenge_url,
        json={"authorityId": AUTHORITY_ID}
    )
    
    if not challenge_response.ok:
        print(f"Failed to get challenge: {challenge_response.text}")
        return False
    
    challenge_data = challenge_response.json()
    challenge = challenge_data.get("challenge")
    
    # Step 3: Sign the challenge
    print("Signing challenge...")
    response_data = sign_challenge(challenge, private_key)
    
    # Step 4: Create a mock partial decryption request
    print("Creating partial decryption request...")
    mock_request = {
        # These values would typically come from the database
        "encryptedVote": {
            "c1": "12345",
            "c2": "67890"
        },
        "electionId": 1,
        "authorityId": AUTHORITY_ID,
        "keyShareId": 1,
        
        # Authentication data
        "challenge": challenge,
        "response": json.dumps(response_data),
        "publicKeyFingerprint": fingerprint
    }
    
    # Step 5: Submit the partial decryption
    print("Submitting partial decryption with authentication...")
    decrypt_url = f"{API_URL}/verification/decrypt/submit-partial"
    decrypt_response = requests.post(decrypt_url, json=mock_request)
    
    # Note: This will likely fail in a test environment without actual keys
    # The important part is testing that authentication is checked
    print(f"Response status: {decrypt_response.status_code}")
    print(f"Response body: {decrypt_response.text}")
    
    # In a test environment, we expect a 404 for the key share, not a 401
    # which would indicate authentication failure
    return decrypt_response.status_code != 401


def main():
    """
    Run all tests
    """
    success = True
    
    try:
        # Run auth test
        auth_success = test_challenge_response()
        if not auth_success:
            success = False
        
        # Add a short delay between tests
        time.sleep(1)
        
        # Run partial decryption test
        decrypt_success = test_partial_decryption_auth()
        if not decrypt_success:
            success = False
    
    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        success = False
    
    # Summary
    print("\n======= Test Summary =======")
    if success:
        print("✅ All tests completed successfully!")
    else:
        print("❌ Some tests failed!")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
