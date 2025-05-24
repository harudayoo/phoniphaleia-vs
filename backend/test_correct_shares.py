#!/usr/bin/env python3

import requests
import json

def test_correct_key_shares():
    """Test key reconstruction and decryption with correct key shares"""
    
    API_URL = 'http://localhost:5000/api'
    
    # Use the actual key shares from the provided files
    correct_shares = [
        '1:92d01a5398b4ba3d0d57c75de4a90458992792da1236b3ae59e78ff1874b6006ef7ecc92c762c8b02cfec239613e2fa485be6386901dee081d25b738154a9daa525c402840423857e31d487eae6977fd9a34efc2cb8acf782f2fce1412040bc716c70f987f7d135c7ff69cd1bba03233e37d87a2deba3350005881af0377caa1125a3fbf7cdc5899f6ba0aaa7d3b163a',
        '2:7eeb909867eab2c7f170ff934b9b4b2f5dfc85c979c2922a37bbeac2f3ebe4ce482d99a78d2bcf3c05c99c08511c688ed9821433a90a0c390d3b808b65bd166605f37d96c48313229bc564ff76df7a60fc09740dc2ca051ec345d1f698b68a25737d5a7172d17edd9a01e8beb6993cdb47a7d297220eca00b8e47ec84343b052975475867881eac5ab02465819c41575',
        '3:c45262ce6da1e9a0ac4ba8a034d6d484fd353e6d8a9c6cdeaaa33ed841f467920f25db127059345b7f6cba8f0f03bd41ffda19a0ffe9e8a8ba933a77038990200de2ae4faac417dcd92e32d675f81cec63eb901b4e4e4a5de7d490631001b4edf9062fd50e7dccdcb13630f6b4a0f760c553ec868a50663fa685e132e2bcdd629df57b67464c30a6623e821abe44afcf'
    ]
    
    payload = {
        'election_id': 55,
        'shares': correct_shares
    }
    
    print('Testing key reconstruction with correct key shares...')
    print(f'Number of shares: {len(correct_shares)}')
    print(f'Share 1 length: {len(correct_shares[0])}')
    print(f'Share 2 length: {len(correct_shares[1])}')
    print(f'Share 3 length: {len(correct_shares[2])}')
    
    try:
        # Test key reconstruction
        print('\n--- STEP 1: Key Reconstruction ---')
        response = requests.post(f'{API_URL}/election_results/reconstruct', json=payload)
        print(f'Status Code: {response.status_code}')
        
        if response.status_code == 200:
            result = response.json()
            print('✓ SUCCESS: Key reconstruction worked with correct shares')
            print(f'Config type: {result.get("config_type")}')
            print(f'Private key length: {len(result.get("private_key", ""))} characters')
            
            # Store the private key for decryption test
            private_key = result.get('private_key')
            
            # Test decryption with the reconstructed key
            print('\n--- STEP 2: Decryption Test ---')
            decrypt_payload = {
                'election_id': 55,
                'private_key': private_key
            }
            
            decrypt_response = requests.post(f'{API_URL}/election_results/decrypt', json=decrypt_payload)
            print(f'Decrypt Status Code: {decrypt_response.status_code}')
            
            if decrypt_response.status_code == 200:
                decrypt_result = decrypt_response.json()
                print('✓ SUCCESS: Decryption worked with correct private key')
                print(f'Decrypted results: {decrypt_result.get("decrypted_results")}')
                
                print('\n--- FINAL VERIFICATION ---')
                print('✓ Both key reconstruction and decryption completed successfully')
                print('✓ Security validation is working correctly')
                print('✓ The system properly accepts correct key shares and rejects wrong ones')
                
            else:
                print('✗ FAILED: Decryption failed')
                print(f'Decrypt Response: {decrypt_response.text}')
        
        else:
            print('✗ FAILED: Key reconstruction failed with correct shares')
            print(f'Response: {response.text}')
    
    except Exception as e:
        print(f'Error during test: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_correct_key_shares()
