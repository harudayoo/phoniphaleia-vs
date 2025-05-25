#!/usr/bin/env python3

import os
import sys
sys.path.append('.')

# Set environment variables if needed
os.environ.setdefault('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/phoniphaleia_db')
os.environ.setdefault('SESSION_TIMEOUT_MINUTES', '30')

from app import create_app, db
from app.models.election_result import ElectionResult
from app.models.election import Election

def check_result_67():
    app = create_app()
    with app.app_context():
        print("=== Checking Result ID 67 ===")
        
        # Check if result_id 67 exists
        result = ElectionResult.query.get(67)
        if result:
            print(f"✓ Result 67 found:")
            print(f"  - Election ID: {result.election_id}")
            print(f"  - Candidate ID: {result.candidate_id}")
            print(f"  - Vote Count: {result.vote_count}")
            print(f"  - Created: {result.created_at}")
        else:
            print("✗ Result 67 not found")
        
        # List all available results
        all_results = ElectionResult.query.all()
        print(f"\nTotal results in database: {len(all_results)}")
        
        if all_results:
            print("\nFirst 10 results:")
            for r in all_results[:10]:
                print(f"  Result ID {r.result_id}: Election {r.election_id}, Candidate {r.candidate_id}, Votes: {r.vote_count}")
            
            # Check what elections have results
            election_ids = set(r.election_id for r in all_results)
            print(f"\nElections with results: {sorted(election_ids)}")
            
            # Show max result_id
            max_result_id = max(r.result_id for r in all_results)
            print(f"Max result_id: {max_result_id}")
        else:
            print("No election results found in database")

if __name__ == "__main__":
    check_result_67()
