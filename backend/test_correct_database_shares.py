#!/usr/bin/env python3

import requests
import json

def test_with_correct_database_shares():
    """Test key reconstruction and decryption with the correct shares from the database"""
    
    API_URL = 'http://localhost:5000/api'
    
    # Use the CORRECT key shares from the database for election 55
    correct_database_shares = [
        '1:f2078ec48cb56c773a9960b8d1eee4acb3aecfae06a786ef1312f7f79d6c4406e0ccbde2998769839e8fd4f7ed1dcda03d',
        '2:f71e8b9aa8c36577f5803181a150d19fbcf7cca706d3808893e7552f63670638080f98e4a5a6e0020915a4a48aeaf310ba',
        '3:f44f6825429eb0230b4725a6e25c6d9f6ea7a70703c13e143067bc8ea58b94cbc97344d9a1928531a445702a2b11cb2778'
    ]
    
    payload = {
        'election_id': 55,
        'shares': correct_database_shares
    }
    
    print('=== TESTING WITH CORRECT DATABASE KEY SHARES ===')
    print(f'Number of shares: {len(correct_database_shares)}')
    print(f'Share 1 length: {len(correct_database_shares[0])}')
    print(f'Share 2 length: {len(correct_database_shares[1])}')
    print(f'Share 3 length: {len(correct_database_shares[2])}')
    print()
    
    try:
        print('--- STEP 1: Key Reconstruction ---')
        response = requests.post(f'{API_URL}/election_results/reconstruct', json=payload)
        print(f'Status Code: {response.status_code}')
        
        if response.status_code == 200:
            result = response.json()
            print('✓ SUCCESS: Key reconstruction worked with correct database shares')
            print(f'Config type: {result.get("config_type")}')
            print(f'Private key length: {len(result.get("private_key", ""))} characters')
            
            # Store the private key for decryption test
            private_key = result.get('private_key')
            
            print('\n--- STEP 2: Decryption Test ---')
            decrypt_payload = {
                'election_id': 55,
                'private_key': private_key
            }
            
            decrypt_response = requests.post(f'{API_URL}/election_results/decrypt', json=decrypt_payload)
            print(f'Decrypt Status Code: {decrypt_response.status_code}')
            
            if decrypt_response.status_code == 200:
                decrypt_result = decrypt_response.json()
                print('✓ SUCCESS: Decryption worked with correct private key!')
                print(f'Decrypted results: {decrypt_result.get("decrypted_results")}')
                print('\n🎉 COMPLETE SUCCESS: Both reconstruction and decryption worked!')
            else:
                print('✗ FAILED: Decryption failed')
                print(f'Decrypt Response: {decrypt_response.text}')
        
        elif response.status_code == 403:
            print('✗ STILL FAILED: Even correct database shares were rejected')
            print(f'Response: {response.text}')
            print('\nThis suggests there might be a deeper issue with the crypto configuration.')
        
        else:
            print('✗ FAILED: Key reconstruction failed with database shares')
            print(f'Response: {response.text}')
    
    except Exception as e:
        print(f'Error during test: {e}')

if __name__ == "__main__":
    test_with_correct_database_shares()
