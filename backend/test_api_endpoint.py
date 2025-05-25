#!/usr/bin/env python3
"""
Test script to verify the updated API endpoint for election results
"""
import requests
import json

def test_api_endpoint():
    """Test the API endpoint"""
    try:
        response = requests.get('http://localhost:5000/api/election_results/67')
        print(f'Status Code: {response.status_code}')
        
        if response.status_code == 200:
            data = response.json()
            print('\nAPI Response Structure:')
            print(f'- election_id: {data.get("election_id")}')
            print(f'- election_name: {data.get("election_name")}')
            print(f'- organization: {data.get("organization", {}).get("org_name") if data.get("organization") else "None"}')
            print(f'- status: {data.get("status")}')
            print(f'- voters_count: {data.get("voters_count")}')
            print(f'- total_votes: {data.get("total_votes")}')
            print(f'- crypto_enabled: {data.get("crypto_enabled")}')
            print(f'- threshold_crypto: {data.get("threshold_crypto")}')
            print(f'- zkp_verified: {data.get("zkp_verified")}')
            
            positions = data.get('positions', [])
            print(f'\n- positions count: {len(positions)}')
            
            if positions:
                for pos in positions:
                    candidates = pos.get('candidates', [])
                    print(f'  - Position: {pos.get("position_name")} ({len(candidates)} candidates)')
                    for candidate in candidates:
                        print(f'    * {candidate.get("name")}: {candidate.get("votes")} votes ({candidate.get("percentage")}%) {"[WINNER]" if candidate.get("winner") else ""}')
            
            candidates = data.get('candidates', [])
            print(f'\n- candidates count (backward compatibility): {len(candidates)}')
            
            print('\nResponse looks good! ✅')
            
        else:
            print(f'Error: {response.text}')
            
    except Exception as e:
        print(f'Error connecting to API: {e}')
        print('Make sure the Flask backend is running on port 5000')

if __name__ == '__main__':
    test_api_endpoint()
