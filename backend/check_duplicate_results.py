#!/usr/bin/env python3
"""
Script to check for duplicate entries in the election_results table
and verify the homomorphic tally process.
"""
import os
import sys
from collections import Counter

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set required environment variables to avoid Flask app initialization errors
os.environ.setdefault('SESSION_TIMEOUT_MINUTES', '30')
# Use the actual PostgreSQL database instead of creating a temporary SQLite one
os.environ.setdefault('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/phoniphaleia_db')
os.environ.setdefault('SECRET_KEY', 'dev-secret-key')

try:
    from app import create_app, db
    from app.models.election_result import ElectionResult
    from app.models.candidate import Candidate
    from app.models.vote import Vote
    from app.models.election import Election
    
    def check_election_results():
        """Check for duplicates in election_results table and analyze vote integrity"""
        print("=" * 60)
        print("ELECTION RESULTS DUPLICATE DETECTION & TALLY VERIFICATION")
        print("=" * 60)
        
        app = create_app()
        with app.app_context():
            # Get all election results
            results = ElectionResult.query.all()
            print(f"\n=== Election Results Table Analysis ===")
            print(f"Total entries in election_results table: {len(results)}")
            
            if not results:
                print("No election results found in database.")
                return
            
            # Display all results with candidate info
            print("\nAll Election Results:")
            for r in results:
                candidate = Candidate.query.get(r.candidate_id) if r.candidate_id else None
                candidate_name = candidate.fullname if candidate else "Unknown"
                print(f"  Result ID: {r.result_id}")
                print(f"  Election: {r.election_id}")
                print(f"  Candidate: {r.candidate_id} ({candidate_name})")
                print(f"  Vote Count: {r.vote_count}")
                print(f"  Encrypted Total: {r.encrypted_vote_total[:50] + '...' if r.encrypted_vote_total else 'None'}")
                print(f"  Created: {r.created_at}")
                print(f"  Updated: {r.updated_at}")
                print("  " + "-" * 50)
            
            # Check for duplicates by candidate_id
            print(f"\n=== Duplicate Detection ===")
            candidate_counts = Counter(r.candidate_id for r in results)
            duplicates = {cid: count for cid, count in candidate_counts.items() if count > 1}
            
            if duplicates:
                print(f"🚨 DUPLICATES FOUND: {duplicates}")
                for cid, count in duplicates.items():
                    candidate = Candidate.query.get(cid)
                    candidate_name = candidate.fullname if candidate else "Unknown"
                    print(f"\n  ⚠️  Candidate {cid} ({candidate_name}) has {count} entries:")
                    
                    # Show all duplicate entries
                    dup_results = ElectionResult.query.filter_by(candidate_id=cid).all()
                    for dr in dup_results:
                        print(f"    - Result ID: {dr.result_id}")
                        print(f"      Election: {dr.election_id}")
                        print(f"      Vote Count: {dr.vote_count}")
                        print(f"      Created: {dr.created_at}")
                        print(f"      Updated: {dr.updated_at}")
            else:
                print("✅ No duplicates found in election_results table")
            
            # Analyze by election
            print(f"\n=== Analysis by Election ===")
            elections_with_results = set(r.election_id for r in results)
            for election_id in elections_with_results:
                election = Election.query.get(election_id)
                election_results = [r for r in results if r.election_id == election_id]
                
                print(f"\nElection {election_id} ({election.election_name if election else 'Unknown'}):")
                print(f"  Status: {election.election_status if election else 'Unknown'}")
                print(f"  Results entries: {len(election_results)}")
                
                # Check for duplicates within this election
                election_candidate_counts = Counter(r.candidate_id for r in election_results)
                election_duplicates = {cid: count for cid, count in election_candidate_counts.items() if count > 1}
                
                if election_duplicates:
                    print(f"  🚨 Duplicates in this election: {election_duplicates}")
                else:
                    print(f"  ✅ No duplicates in this election")
                
                # Show candidate breakdown
                for r in election_results:
                    candidate = Candidate.query.get(r.candidate_id)
                    candidate_name = candidate.fullname if candidate else "Unknown"
                    print(f"    Candidate {r.candidate_id} ({candidate_name}): {r.vote_count} votes")
            
            # Compare with votes table
            print(f"\n=== Votes Table Comparison ===")
            votes = Vote.query.all()
            print(f"Total votes in database: {len(votes)}")
            
            if votes:
                vote_counts_by_candidate = Counter(v.candidate_id for v in votes)
                print("\nVote distribution by candidate (from votes table):")
                for cid, count in vote_counts_by_candidate.items():
                    candidate = Candidate.query.get(cid)
                    candidate_name = candidate.fullname if candidate else "Unknown"
                    print(f"  Candidate {cid} ({candidate_name}): {count} votes")
                
                # Compare votes vs results
                print(f"\n=== Vote Count Verification ===")
                for cid, vote_count in vote_counts_by_candidate.items():
                    # Get the result entries for this candidate
                    result_entries = [r for r in results if r.candidate_id == cid]
                    
                    if not result_entries:
                        print(f"  ⚠️  Candidate {cid}: {vote_count} votes but NO result entry")
                    elif len(result_entries) == 1:
                        result_count = result_entries[0].vote_count
                        if result_count == vote_count:
                            print(f"  ✅ Candidate {cid}: {vote_count} votes = {result_count} result ✓")
                        else:
                            print(f"  🚨 Candidate {cid}: {vote_count} votes ≠ {result_count} result ✗")
                    else:
                        total_result_count = sum(r.vote_count or 0 for r in result_entries)
                        print(f"  🚨 Candidate {cid}: {vote_count} votes vs {len(result_entries)} result entries (total: {total_result_count})")
                        for i, r in enumerate(result_entries):
                            print(f"      Entry {i+1}: {r.vote_count} votes (Result ID: {r.result_id})")
            
            # Summary and recommendations
            print(f"\n=== Summary and Recommendations ===")
            if duplicates:
                print("🚨 ACTION REQUIRED: Duplicate entries detected in election_results table")
                print("   Recommendations:")
                print("   1. Use ElectionResult.cleanup_duplicates(election_id) to remove duplicates")
                print("   2. Investigate why duplicates were created (check tally_election logic)")
                print("   3. Verify the unique constraint is properly enforced")
                
                # Show cleanup commands
                affected_elections = set(r.election_id for r in results if r.candidate_id in duplicates)
                for election_id in affected_elections:
                    print(f"   Cleanup command: ElectionResult.cleanup_duplicates({election_id})")
            else:
                print("✅ GOOD: No duplicate entries found")
                print("   The election results table appears to be clean")
            
            print(f"\nScript completed. Check the analysis above for any issues.")
    
    if __name__ == "__main__":
        check_election_results()
        
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Make sure you're running this script from the backend directory")
    sys.exit(1)
except Exception as e:
    print(f"Error running script: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
