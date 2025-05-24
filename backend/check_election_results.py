#!/usr/bin/env python3
"""
Script to check election results in the database using the ElectionResult model.
This will help us understand what vote counts are actually stored.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.election_result import ElectionResult
from app.models.candidate import Candidate
from app.models.position import Position
from app.models.vote import Vote

def check_election_results(election_id=55):
    """Check the actual data in the database for election 55"""
    
    print(f"\n=== CHECKING ELECTION {election_id} RESULTS ===")
    
    # Check ElectionResult table
    print("\n1. ElectionResult table entries:")
    results = ElectionResult.query.filter_by(election_id=election_id).all()
    print(f"Found {len(results)} election result entries:")
    
    for result in results:
        print(f"  - Result ID: {result.result_id}")
        print(f"    Candidate ID: {result.candidate_id}")
        print(f"    Vote Count: {result.vote_count}")
        print(f"    Encrypted Vote Total: {result.encrypted_vote_total[:50] if result.encrypted_vote_total else None}...")
        print(f"    Created: {result.created_at}")
        print()
    
    # Check Vote table to see actual votes
    print("\n2. Vote table entries:")
    votes = Vote.query.filter_by(election_id=election_id).all()
    print(f"Found {len(votes)} vote entries:")
    
    vote_counts_by_candidate = {}    
    for vote in votes:
        print(f"  - Vote ID: {vote.vote_id}")
        print(f"    Candidate ID: {vote.candidate_id}")
        print(f"    Student ID: {vote.student_id}")
        print(f"    Encrypted Vote: {vote.encrypted_vote[:50] if vote.encrypted_vote else None}...")
        print(f"    Vote Status: {vote.vote_status}")
        print(f"    Cast Time: {vote.cast_time}")
        
        # Count votes per candidate
        if vote.candidate_id in vote_counts_by_candidate:
            vote_counts_by_candidate[vote.candidate_id] += 1
        else:
            vote_counts_by_candidate[vote.candidate_id] = 1
        print()
    
    print("\n3. Vote counts by candidate (from Vote table):")
    for candidate_id, count in vote_counts_by_candidate.items():
        print(f"  - Candidate {candidate_id}: {count} votes")
    
    # Check candidates and positions
    print("\n4. Candidate information:")
    candidates = Candidate.query.filter_by(election_id=election_id).all()
    for candidate in candidates:
        position = Position.query.get(candidate.position_id)
        vote_count_from_results = 0
        election_result = ElectionResult.query.filter_by(
            election_id=election_id, 
            candidate_id=candidate.candidate_id
        ).first()
        if election_result:
            vote_count_from_results = election_result.vote_count or 0
        
        print(f"  - Candidate {candidate.candidate_id}: {candidate.fullname}")
        print(f"    Position: {position.position_name if position else 'Unknown'} (ID: {candidate.position_id})")
        print(f"    Party: {candidate.party}")
        print(f"    Votes in Vote table: {vote_counts_by_candidate.get(candidate.candidate_id, 0)}")
        print(f"    Vote count in ElectionResult table: {vote_count_from_results}")
        print()
    
    # Summary
    print("\n5. SUMMARY:")
    print(f"Total votes in Vote table: {len(votes)}")
    print(f"Total candidates: {len(candidates)}")
    print(f"Total election results: {len(results)}")
    
    # Check for discrepancies
    print("\n6. DISCREPANCIES:")
    for candidate_id in vote_counts_by_candidate:
        actual_votes = vote_counts_by_candidate[candidate_id]
        election_result = ElectionResult.query.filter_by(
            election_id=election_id, 
            candidate_id=candidate_id
        ).first()
        stored_votes = election_result.vote_count if election_result else 0
        
        if actual_votes != stored_votes:
            print(f"  ❌ Candidate {candidate_id}: Actual votes = {actual_votes}, Stored votes = {stored_votes}")
        else:
            print(f"  ✅ Candidate {candidate_id}: Votes match ({actual_votes})")

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        check_election_results()
