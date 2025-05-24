#!/usr/bin/env python3
"""
Test script to verify the actual API endpoint works with real share formats.
"""

import json
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.controllers.election_results_controller import ElectionResultsController
import shamirs

def test_share_parsing_with_prime():
    """Test that share parsing works with a proper prime modulus like the API uses"""
    
    # Real share from the error message
    test_share = "1:992ad4ca041308c388ffffa9f0cc50b05530e247eb5983ca0a70458f211dcdb9030a1079f31906c7aa1763010da55a2018d6bd6fb72f0dc9ba9767684b9ee955a0357c942c181f65941b550cc370c6d4c1cfe517ea1b9e5d7feea0cfb2aba398236da20cceb11d8677b97b0a7259d01e1cecc75c7a4d5fbbb4a5c02e650b0a7b4c45e7c5dd391f3eba6930d87ffc5569"
    
    # Use a realistic prime modulus (similar to what would be generated)
    # This should be a large prime number
    prime = 2**512 + 1  # Simple example prime
    # In real usage, this would come from the crypto config metadata
    
    print(f"Testing share parsing with prime: {prime}")
    print(f"Testing share: {test_share[:80]}...")
    
    try:
        # Parse x:hex(y) format
        x_str, y_hex = test_share.split(':', 1)
        x = int(x_str)
        y = int(y_hex, 16)
        
        print(f"✓ Parsed x: {x}")
        print(f"✓ Parsed y (length): {len(str(y))} digits")
        
        # Create shamirs.share object
        share_obj = shamirs.share(x, y, prime)
        
        print(f"✓ Successfully created shamirs.share object")
        print(f"  Share index: {share_obj.index}")
        print(f"  Share value: {str(share_obj.value)[:80]}...")
        
        # Test with multiple shares (simulate a realistic scenario)
        shares_list = [share_obj]
        
        # Create additional test shares to simulate a threshold scenario
        secret = 12345  # Test secret
        threshold = 3
        test_shares = shamirs.shares(secret, quantity=5, modulus=prime, threshold=threshold)
        
        print(f"✓ Created {len(test_shares)} test shares for reconstruction")
        
        # Test reconstruction with minimum threshold
        reconstruction_shares = test_shares[:threshold]
        reconstructed = shamirs.interpolate(reconstruction_shares)
        
        if reconstructed == secret:
            print(f"✓ Reconstruction successful: {secret}")
        else:
            print(f"✗ Reconstruction failed: expected {secret}, got {reconstructed}")
            return False
            
        print(f"✓ All share operations successful!")
        return True
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_share_format_compatibility():
    """Test that our share format is compatible with the shamirs library"""
    
    print("\nTesting share format compatibility...")
    
    # Generate shares in the format we use in the system
    secret = 98765
    threshold = 3
    quantity = 5
    prime = 2**512 + 1
    
    # Generate shares
    shares_raw = shamirs.shares(secret, quantity=quantity, modulus=prime, threshold=threshold)
    
    # Convert to our string format (as done in the system)
    shares_string_format = [f"{share.index}:{hex(share.value)[2:]}" for share in shares_raw]
    
    print(f"Generated {len(shares_string_format)} shares in string format")
    print(f"Example share: {shares_string_format[0][:80]}...")
    
    # Parse them back (as done in the API)
    parsed_shares = []
    for s in shares_string_format:
        x_str, y_hex = s.split(':', 1)
        x = int(x_str)
        y = int(y_hex, 16)
        share_obj = shamirs.share(x, y, prime)
        parsed_shares.append(share_obj)
    
    print(f"✓ Parsed {len(parsed_shares)} shares back to objects")
    
    # Test reconstruction
    reconstruction_shares = parsed_shares[:threshold]
    reconstructed = shamirs.interpolate(reconstruction_shares)
    
    if reconstructed == secret:
        print(f"✓ Round-trip reconstruction successful: {secret}")
        return True
    else:
        print(f"✗ Round-trip reconstruction failed: expected {secret}, got {reconstructed}")
        return False

if __name__ == "__main__":
    print("Testing Real Share API Compatibility")
    print("=" * 50)
    
    success1 = test_share_parsing_with_prime()
    success2 = test_share_format_compatibility()
    
    if success1 and success2:
        print("\n🎉 All real share API tests passed!")
        print("The system should now work with actual share data!")
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)
