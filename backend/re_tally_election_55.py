#!/usr/bin/env python3
"""
Re-tally election 55 by clearing incorrect ElectionResult records and re-running tally_election.
This will properly aggregate the encrypted votes containing value 1 from the Vote table.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models.vote import Vote
from app.models.election_result import ElectionResult
from app.models.candidate import Candidate
from app.models.position import Position
from app.extensions import db
import requests
import json

def analyze_current_state():
    """Analyze current state of votes and election results"""
    print("=== CURRENT STATE ANALYSIS ===")
    
    # Check votes in Vote table
    votes = Vote.query.filter_by(election_id=55).all()
    print(f"\nVotes in Vote table for election 55: {len(votes)}")
    
    for vote in votes:
        # Get candidate info
        candidate = Candidate.query.get(vote.candidate_id)
        position = Position.query.get(vote.position_id) if vote.position_id else None
        
        print(f"  Vote ID {vote.vote_id}:")
        print(f"    Candidate: {candidate.fullname} (ID: {vote.candidate_id})")
        print(f"    Position: {position.position_name if position else 'Unknown'}")
        print(f"    Encrypted vote: {vote.encrypted_vote[:50]}...")
        print()
    
    # Check current ElectionResult records
    results = ElectionResult.query.filter_by(election_id=55).all()
    print(f"ElectionResult records for election 55: {len(results)}")
    
    for result in results:
        candidate = Candidate.query.get(result.candidate_id)
        print(f"  Result ID {result.result_id}:")
        print(f"    Candidate: {candidate.fullname} (ID: {result.candidate_id})")
        print(f"    Vote count: {result.vote_count}")
        print(f"    Encrypted total: {result.encrypted_vote_total[:50] if result.encrypted_vote_total else 'None'}...")
        print()

def clear_election_results():
    """Clear existing ElectionResult records for election 55"""
    print("=== CLEARING ELECTION RESULTS ===")
    
    results = ElectionResult.query.filter_by(election_id=55).all()
    count = len(results)
    
    for result in results:
        db.session.delete(result)
    
    db.session.commit()
    print(f"Deleted {count} ElectionResult records for election 55")

def re_tally_election():
    """Re-run tally_election for election 55 via API call"""
    print("=== RE-TALLYING ELECTION ===")
    
    # Call the tally_election API endpoint
    api_url = "http://localhost:5000/api/election_results/tally"
    payload = {"election_id": 55}
    
    try:
        response = requests.post(api_url, json=payload, headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Tally election successful!")
            print(f"Encrypted results: {result.get('encrypted_results', {})}")
            return True
        else:
            print(f"❌ Tally election failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error calling tally API: {str(e)}")
        return False

def verify_corrected_results():
    """Verify the corrected ElectionResult records"""
    print("=== VERIFYING CORRECTED RESULTS ===")
    
    results = ElectionResult.query.filter_by(election_id=55).all()
    print(f"\nNew ElectionResult records for election 55: {len(results)}")
    
    for result in results:
        candidate = Candidate.query.get(result.candidate_id)
        print(f"  Result ID {result.result_id}:")
        print(f"    Candidate: {candidate.fullname} (ID: {result.candidate_id})")
        print(f"    Vote count: {result.vote_count}")
        print(f"    Encrypted total: {result.encrypted_vote_total[:50] if result.encrypted_vote_total else 'None'}...")
        print()

def main():
    app = create_app()
    
    with app.app_context():
        print("Re-tallying Election 55 - Root Cause Fix")
        print("=" * 50)
        
        # Step 1: Analyze current state
        analyze_current_state()
        
        # Step 2: Clear incorrect ElectionResult records
        clear_election_results()
        
        # Step 3: Re-run tally_election to properly aggregate encrypted votes
        success = re_tally_election()
        
        if success:
            # Step 4: Verify the corrected results
            verify_corrected_results()
            print("\n✅ SUCCESS: Election 55 has been properly re-tallied!")
            print("The ElectionResult table now contains properly aggregated encrypted totals")
            print("from individual votes that encrypt the value 1 (not candidate IDs)")
        else:
            print("\n❌ FAILED: Could not re-tally election 55")

if __name__ == "__main__":
    main()
