"""
Simple test script for key generation. This tests the key generation function
without going through the entire web API.
"""
import sys
import os
import json

# Add the app directory to the path so we can import from it
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import create_app, db
from app.models.crypto_config import CryptoConfig
from app.models.trusted_authority import TrustedAuthority
from app.services.crypto.threshold_elgamal import ThresholdElGamalService
from phe import paillier
from app.services.crypto.shamir import split_secret, next_prime, serialize_share

def test_threshold_elgamal():
    print("Testing Threshold ElGamal key generation...")
    
    # Parameters
    n_personnel = 3
    threshold = 2
    
    try:
        # Generate key pair
        key_data = ThresholdElGamalService.generate_key_pair(n_personnel, threshold)
        print(f"Key data generated successfully with {len(key_data['key_shares'])} shares")
        
        # Test serialization
        serialized_pk = ThresholdElGamalService.serialize_public_key(key_data["public_key"])
        print(f"Public key serialized: {serialized_pk[:50]}...")
        
        return True
    except Exception as e:
        print(f"Error in ElGamal test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_paillier():
    print("Testing Paillier key generation...")
    
    try:
        # Generate keypair
        public_key, private_key = paillier.generate_paillier_keypair(n_length=1024)  # Use smaller key for faster test
        print(f"Key generated with length: {public_key.n.bit_length()} bits")
        
        # Test Shamir sharing
        n_personnel = 3
        threshold = 2
        
        # Get p from private key for sharing
        p = int(private_key.p)
        
        # Calculate prime modulus
        bits_needed = max(p.bit_length() + 128, 512)
        prime_candidate = 2**bits_needed
        prime = next_prime(prime_candidate)
        
        # Generate shares
        shares_raw = split_secret(p, n_personnel, threshold)
        shares = [serialize_share(share) for share in shares_raw]
        
        print(f"Generated {len(shares)} shares")
        return True
    except Exception as e:
        print(f"Error in Paillier test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Run tests
    app = create_app()
    with app.app_context():
        print("Starting key generation tests...")
        elgamal_result = test_threshold_elgamal()
        paillier_result = test_paillier()
        
        if elgamal_result and paillier_result:
            print("All tests passed!")
            sys.exit(0)
        else:
            print("Tests failed!")
            sys.exit(1)
