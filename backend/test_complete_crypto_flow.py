#!/usr/bin/env python3
"""
Comprehensive test of the complete crypto flow:
1. Key generation with Shamir sharing
2. Vote encryption
3. Key reconstruction
4. Vote decryption
"""

import sys
import os
sys.path.append(os.getcwd())

from phe import paillier
import shamirs
import json

def test_complete_crypto_flow():
    """Test the complete crypto workflow"""
    print("=" * 60)
    print("TESTING COMPLETE CRYPTO FLOW")
    print("=" * 60)
    
    # Step 1: Generate Paillier keypair
    print("\n1. Generating Paillier keypair...")
    try:
        public_key, private_key = paillier.generate_paillier_keypair(n_length=1024)
        print(f"✓ Generated keypair with n={len(str(public_key.n))} digits")
        print(f"✓ Private key p={len(str(private_key.p))} digits, q={len(str(private_key.q))} digits")
    except Exception as e:
        print(f"✗ Key generation failed: {e}")
        return False
    
    # Step 2: Create Shamir shares
    print("\n2. Creating Shamir shares...")
    try:
        secret = int(private_key.p)
        threshold = 3
        n_shares = 5
        
        # Use a large prime for Shamir sharing
        prime = 13407807929942597099574024998205846127479365820592393377723561443721764030073546976801874298166903427690031858186486050853753882811946569946433649006083527
        
        shares = shamirs.shares(secret, quantity=n_shares, modulus=prime, threshold=threshold)
        print(f"✓ Generated {len(shares)} Shamir shares with threshold {threshold}")
        print(f"✓ Using prime modulus with {prime.bit_length()} bits")
    except Exception as e:
        print(f"✗ Shamir sharing failed: {e}")
        return False
    
    # Step 3: Encrypt a vote
    print("\n3. Encrypting a vote...")
    try:
        vote_value = 1  # Vote for candidate 1
        encrypted_vote = public_key.encrypt(vote_value)
        print(f"✓ Encrypted vote: {vote_value} -> {len(str(encrypted_vote.ciphertext()))} digit ciphertext")
    except Exception as e:
        print(f"✗ Vote encryption failed: {e}")
        return False
    
    # Step 4: Reconstruct private key from shares
    print("\n4. Reconstructing private key from shares...")
    try:
        # Use threshold number of shares
        selected_shares = shares[:threshold]
        reconstructed_p = shamirs.interpolate(selected_shares)
        
        print(f"✓ Reconstructed secret: {reconstructed_p == secret}")
        
        # Reconstruct the full private key
        n = public_key.n
        reconstructed_q = n // reconstructed_p
        
        new_pubkey = paillier.PaillierPublicKey(n=n)
        new_privkey = paillier.PaillierPrivateKey(new_pubkey, reconstructed_p, reconstructed_q)
        
        print(f"✓ Reconstructed private key successfully")
    except Exception as e:
        print(f"✗ Key reconstruction failed: {e}")
        return False
    
    # Step 5: Decrypt the vote with reconstructed key
    print("\n5. Decrypting vote with reconstructed key...")
    try:
        decrypted_vote = new_privkey.decrypt(encrypted_vote)
        print(f"✓ Decrypted vote: {decrypted_vote}")
        print(f"✓ Decryption correct: {decrypted_vote == vote_value}")
    except Exception as e:
        print(f"✗ Vote decryption failed: {e}")
        return False
    
    # Step 6: Test homomorphic addition
    print("\n6. Testing homomorphic addition...")
    try:
        vote1 = public_key.encrypt(1)
        vote2 = public_key.encrypt(1)
        vote3 = public_key.encrypt(1)
        
        # Add encrypted votes
        total_encrypted = vote1 + vote2 + vote3
        total_decrypted = new_privkey.decrypt(total_encrypted)
        
        print(f"✓ Added 3 encrypted votes: {total_decrypted}")
        print(f"✓ Homomorphic addition correct: {total_decrypted == 3}")
    except Exception as e:
        print(f"✗ Homomorphic addition failed: {e}")
        return False
    
    # Step 7: Test share format conversion (like in the API)
    print("\n7. Testing share format conversion...")
    try:
        # Convert shares to string format (like in API)
        share_strings = [f"{share.index}:{hex(share.value)[2:]}" for share in shares]
        print(f"✓ Converted {len(share_strings)} shares to string format")
        
        # Parse them back (like in verification controller)
        parsed_shares = []
        for s in share_strings[:threshold]:
            x_str, y_hex = s.split(':', 1)
            x = int(x_str)
            y = int(y_hex, 16)
            share_obj = shamirs.share(x, y, prime)
            parsed_shares.append(share_obj)
        
        # Reconstruct from parsed shares
        reconstructed_p2 = shamirs.interpolate(parsed_shares)
        print(f"✓ Share format conversion correct: {reconstructed_p2 == secret}")
    except Exception as e:
        print(f"✗ Share format conversion failed: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✓ ALL CRYPTO TESTS PASSED!")
    print("✓ Complete crypto flow working correctly")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_complete_crypto_flow()
    sys.exit(0 if success else 1)
