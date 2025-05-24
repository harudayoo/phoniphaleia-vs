#!/usr/bin/env python3
"""
Test script to verify the crypto configuration fix for prime modulus storage.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Flask app context
from app import create_app
from app.controllers.crypto_config_controller import CryptoConfigController
import json
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app for testing
app = create_app()

def test_fixed_key_generation():
    """Test key generation with the fixed prime storage"""
    try:
        print("Testing Fixed Key Generation")
        print("=" * 50)
        
        with app.app_context():
            # Generate key pair data
            key_data = CryptoConfigController.generate_key_pair(
                election_id=-12345,  # Temporary ID
                n_personnel=3,
                threshold=2
            )
        
        print(f"Key generation successful!")
        
        # Check security data structure
        security_data = key_data.get('security_data', {})
        print(f"Security data keys: {list(security_data.keys())}")
        
        # Verify we have both the Paillier prime p and the Shamir modulus
        if 'p' in security_data and 'prime_modulus' in security_data:
            paillier_p = int(security_data['p'])
            shamir_prime = int(security_data['prime_modulus'])
            public_n = int(security_data['n'])
            
            print(f"Paillier prime p: {paillier_p.bit_length()} bits")
            print(f"Shamir modulus: {shamir_prime.bit_length()} bits")
            print(f"Public key n: {public_n.bit_length()} bits")
            
            # Verify p divides n
            if public_n % paillier_p == 0:
                print("✅ Paillier prime p correctly divides public key n")
                q = public_n // paillier_p
                print(f"Calculated q: {q.bit_length()} bits")
                print(f"p * q = n: {paillier_p * q == public_n}")
            else:
                print("❌ Paillier prime p does NOT divide public key n")
                return False
            
            # Verify Shamir prime is larger than Paillier prime
            if shamir_prime > paillier_p:
                print("✅ Shamir modulus is larger than Paillier prime p (correct for secret sharing)")
            else:
                print("❌ Shamir modulus should be larger than Paillier prime p")
                return False
                
            print(f"Shares generated: {len(key_data.get('serialized_shares', []))}")
            return True
        else:
            print("❌ Missing required prime data in security_data")
            return False
            
    except Exception as e:
        print(f"❌ Error in key generation test: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_in_memory_key_generation():
    """Test in-memory key generation with the same fix"""
    try:
        print("\nTesting In-Memory Key Generation")
        print("=" * 50)
          # Mock request data
        class MockRequest:
            json = {
                'n_personnel': 3,
                'threshold': 2,
                'crypto_method': 'paillier',
                'authority_names': ['Authority1', 'Authority2', 'Authority3']
            }
        
        # Temporarily replace request
        import app.controllers.crypto_config_controller as crypto_module
        original_request = getattr(crypto_module, 'request', None)
        crypto_module.request = MockRequest()
        
        try:
            with app.app_context():
                result, status_code = CryptoConfigController.generate_key_pair_in_memory()
            
            if status_code == 200:
                result_data = json.loads(result.data.decode('utf-8'))
                meta_data = result_data.get('meta_data', {})
                security_data = result_data.get('security_data', {})
                
                print("✅ In-memory key generation successful")
                print(f"Meta data keys: {list(meta_data.keys())}")
                print(f"Security data keys: {list(security_data.keys())}")
                
                # Check if we have both prime types
                if 'p' in meta_data and 'prime_modulus' in meta_data:
                    paillier_p = int(meta_data['p'])
                    shamir_prime = int(meta_data['prime_modulus'])
                    
                    print(f"Paillier prime p: {paillier_p.bit_length()} bits")
                    print(f"Shamir modulus: {shamir_prime.bit_length()} bits")
                    
                    if shamir_prime > paillier_p:
                        print("✅ In-memory generation correctly stores both primes")
                        return True
                    else:
                        print("❌ Prime relationship incorrect in in-memory generation")
                        return False
                else:
                    print("❌ Missing prime data in in-memory generation")
                    return False
            else:
                print(f"❌ In-memory key generation failed with status {status_code}")
                return False
                
        finally:
            # Restore original request
            if original_request:
                crypto_module.request = original_request
            
    except Exception as e:
        print(f"❌ Error in in-memory key generation test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Testing Fixed Crypto Configuration")
    print("=" * 60)
    
    test1_passed = test_fixed_key_generation()
    test2_passed = test_in_memory_key_generation()
    
    print("\n" + "=" * 60)
    print("SUMMARY:")
    print(f"✅ Key Generation Test: {'PASSED' if test1_passed else 'FAILED'}")
    print(f"✅ In-Memory Generation Test: {'PASSED' if test2_passed else 'FAILED'}")
    
    if test1_passed and test2_passed:
        print("\n🎉 ALL TESTS PASSED! The crypto configuration fix is working correctly.")
        print("The system now properly stores:")
        print("  - Paillier prime factor 'p' (for reconstruction)")
        print("  - Shamir modulus prime (for secret sharing)")
        print("  - Proper validation that p divides n")
    else:
        print("\n❌ Some tests failed. Please review the issues above.")
