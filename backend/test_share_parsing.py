#!/usr/bin/env python3
"""
Test script to verify share parsing works correctly with real share formats.
"""

import shamirs

def test_share_parsing():
    """Test parsing shares in the x:hex(y) format"""
    
    # Test share from the error message
    test_share = "1:992ad4ca041308c388ffffa9f0cc50b05530e247eb5983ca0a70458f211dcdb9030a1079f31906c7aa1763010da55a2018d6bd6fb72f0dc9ba9767684b9ee955a0357c942c181f65941b550cc370c6d4c1cfe517ea1b9e5d7feea0cfb2aba398236da20cceb11d8677b97b0a7259d01e1cecc75c7a4d5fbbb4a5c02e650b0a7b4c45e7c5dd391f3eba6930d87ffc5569"
    
    # Use a test prime (should match the one used in key generation)
    prime = 2**512 + 1  # Example prime
    
    print(f"Testing share parsing with share: {test_share[:50]}...")
    
    try:
        # Parse x:hex(y) format
        x_str, y_hex = test_share.split(':', 1)
        x = int(x_str)
        y = int(y_hex, 16)
        
        print(f"Parsed x: {x}")
        print(f"Parsed y (first 50 chars): {str(y)[:50]}...")
        
        # Create shamirs.share object
        share_obj = shamirs.share(x, y, prime)
        
        print(f"✓ Successfully created shamirs.share object")
        print(f"  Share index: {share_obj.index}")
        print(f"  Share value (first 50 chars): {str(share_obj.value)[:50]}...")
        
        # Test that we can use it in a list
        shares_list = [share_obj]
        print(f"✓ Successfully added to shares list")
        
        return True
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    print("Testing Share Parsing")
    print("=" * 30)
    
    success = test_share_parsing()
    
    if success:
        print("\n🎉 Share parsing test passed!")
    else:
        print("\n❌ Share parsing test failed!")
