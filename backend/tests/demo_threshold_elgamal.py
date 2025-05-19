"""
Demo script for testing threshold ElGamal encryption and decryption
"""
import sys
import os
import json

# Add parent directory to path to import app modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app.services.crypto.threshold_elgamal import ThresholdElGamalService

def main():
    # Parameters
    n_authorities = 5  # Number of trusted authorities
    threshold = 3      # Minimum required for decryption
    vote_value = 42    # Vote to encrypt
    
    print("\n=== Threshold ElGamal Cryptography Demo ===\n")
    
    # Step 1: Generate key pair
    print(f"Generating key pair for {n_authorities} authorities with threshold {threshold}...")
    key_data = ThresholdElGamalService.generate_key_pair(n_authorities, threshold)
    
    # Print public key
    public_key = key_data["public_key"]
    print(f"\nPublic Key:")
    print(f"  g: {public_key['g'][:20]}...")
    print(f"  h: {public_key['h'][:20]}...")
    print(f"  p: {public_key['p'][:20]}...")
    print(f"  q: {public_key['q'][:20]}...")
    
    # Print key shares info (not the actual values)
    print(f"\nGenerated {len(key_data['key_shares'])} key shares:")
    for i, share in enumerate(key_data["key_shares"]):
        print(f"  Authority #{share['id']}: Key share available")
    
    # Step 2: Encrypt a vote
    public_key_json = json.dumps(public_key)
    print(f"\nEncrypting vote value: {vote_value}")
    encrypted_vote = ThresholdElGamalService.encrypt_vote(public_key_json, vote_value)
    print(f"Encrypted vote:")
    print(f"  c1: {encrypted_vote['c1'][:20]}...")
    print(f"  c2: {encrypted_vote['c2'][:20]}...")
    
    # Step 3: Generate partial decryptions (simulating each authority)
    print(f"\nGenerating partial decryptions from {threshold + 1} authorities:")
    partial_decryptions = []
    for i in range(threshold + 1):
        share = key_data["key_shares"][i]
        auth_id = share["id"]
        key_share = share["key"]
        
        print(f"  Authority #{auth_id} generating partial decryption...")
        partial_dec = ThresholdElGamalService.generate_partial_decryption(
            public_key_json, key_share, encrypted_vote
        )
        partial_decryptions.append((auth_id, partial_dec["partial_decryption"]))
    
    # Step 4: Combine partial decryptions to reveal the vote
    print(f"\nCombining partial decryptions to reveal the vote...")
    decrypted_vote = ThresholdElGamalService.combine_partial_decryptions(
        public_key_json, encrypted_vote, partial_decryptions
    )
    
    print(f"\n=== Results ===")
    print(f"Original vote: {vote_value}")
    print(f"Decrypted vote: {decrypted_vote}")
    print(f"Decryption {'successful' if vote_value == decrypted_vote else 'failed'}")
    
    # Step 5: Test with insufficient shares
    print(f"\n=== Testing with insufficient shares ===")
    insufficient_shares = partial_decryptions[:threshold-1]
    print(f"Attempting decryption with only {len(insufficient_shares)} shares (threshold is {threshold})...")
    try:
        ThresholdElGamalService.combine_partial_decryptions(
            public_key_json, encrypted_vote, insufficient_shares
        )
        print("Error: Decryption should have failed but didn't!")
    except Exception as e:
        print(f"Decryption failed as expected: {str(e)}")

if __name__ == "__main__":
    main()
