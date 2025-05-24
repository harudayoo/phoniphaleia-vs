"""
Fix verification status for election results.

This script identifies elections with decrypted results that have 'False' in the
verified column, despite actually passing verification, and fixes them by
updating the database to mark them as properly verified.

Usage:
    python fix_verification_status.py [--election_id ID]

Options:
    --election_id ID    Fix only the specified election ID

Example:
    python fix_verification_status.py --election_id 55
    python fix_verification_status.py  # Fix all elections
"""
import requests
import argparse
import sys
import json

# Configuration
API_URL = 'http://localhost:5000/api'  # Update this if your API URL is different

def fix_verification_status(election_id=None):
    """Call API to fix verification status for one or all elections"""
    url = f"{API_URL}/election_results/fix-verification"
    payload = {}
    if election_id:
        payload['election_id'] = int(election_id)
    
    print(f"Requesting verification fix for {'election ' + str(election_id) if election_id else 'all elections'}...")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        result = response.json()
        print("\nAPI Response:")
        print(json.dumps(result, indent=2))
        
        if result.get('success'):
            verified_count = len(result.get('results', {}).get('verified', []))
            failed_count = len(result.get('results', {}).get('failed', []))
            
            print(f"\nSUMMARY:")
            print(f"- {verified_count} elections successfully verified")
            if failed_count > 0:
                print(f"- {failed_count} elections failed verification")
                return False
            return True
        else:
            print(f"\nERROR: {result.get('error')}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"\nERROR: API request failed: {e}")
        return False
    except json.JSONDecodeError:
        print(f"\nERROR: API returned non-JSON response")
        print(f"Response: {response.text}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Fix verification status for election results")
    parser.add_argument('--election_id', type=int, help='Fix only the specified election ID')
    args = parser.parse_args()
    
    success = fix_verification_status(args.election_id)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
