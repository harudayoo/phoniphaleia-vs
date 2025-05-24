#!/usr/bin/env python3
"""
Script to fix the incorrect vote counts in ElectionResult table.
The issue is that candidate IDs were stored as vote counts instead of actual vote counts.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.election_result import ElectionResult
from app.models.candidate import Candidate
from app.models.position import Position
from app.models.vote import Vote

def fix_election_results(election_id=55):
    """Fix the vote counts in ElectionResult table for election 55"""
    
    print(f"\n=== FIXING ELECTION {election_id} RESULTS ===")
    
    # Get actual vote counts from Vote table
    print("\n1. Calculating actual vote counts from Vote table...")
    votes = Vote.query.filter_by(election_id=election_id).all()
    vote_counts_by_candidate = {}
    
    for vote in votes:
        if vote.candidate_id in vote_counts_by_candidate:
            vote_counts_by_candidate[vote.candidate_id] += 1
        else:
            vote_counts_by_candidate[vote.candidate_id] = 1
    
    print("Actual vote counts:")
    for candidate_id, count in vote_counts_by_candidate.items():
        print(f"  - Candidate {candidate_id}: {count} votes")
    
    # Update ElectionResult table with correct vote counts
    print("\n2. Updating ElectionResult table...")
    
    # Get all candidates for this election
    candidates = Candidate.query.filter_by(election_id=election_id).all()
    
    for candidate in candidates:
        # Get or create election result for this candidate
        election_result = ElectionResult.query.filter_by(
            election_id=election_id,
            candidate_id=candidate.candidate_id
        ).first()
        
        # Get actual vote count (default to 0 if no votes)
        actual_votes = vote_counts_by_candidate.get(candidate.candidate_id, 0)
        
        if election_result:
            old_count = election_result.vote_count
            election_result.vote_count = actual_votes
            print(f"  - Updated Candidate {candidate.candidate_id}: {old_count} → {actual_votes}")
        else:
            # Create new election result if it doesn't exist
            election_result = ElectionResult(
                election_id=election_id,
                candidate_id=candidate.candidate_id,
                vote_count=actual_votes
            )
            db.session.add(election_result)
            print(f"  - Created new result for Candidate {candidate.candidate_id}: {actual_votes} votes")
    
    # Commit the changes
    try:
        db.session.commit()
        print("\n✅ Successfully updated vote counts in ElectionResult table!")
    except Exception as e:
        db.session.rollback()
        print(f"\n❌ Error updating vote counts: {e}")
        return False
    
    # Verify the fix
    print("\n3. Verifying the fix...")
    results = ElectionResult.query.filter_by(election_id=election_id).all()
    
    for result in results:
        actual_votes = vote_counts_by_candidate.get(result.candidate_id, 0)
        if result.vote_count == actual_votes:
            print(f"  ✅ Candidate {result.candidate_id}: {result.vote_count} votes (correct)")
        else:
            print(f"  ❌ Candidate {result.candidate_id}: {result.vote_count} votes (should be {actual_votes})")
    
    return True

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        success = fix_election_results()
        if success:
            print("\n🎉 Election results have been successfully corrected!")
        else:
            print("\n😞 Failed to fix election results.")
