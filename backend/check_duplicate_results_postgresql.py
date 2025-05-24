#!/usr/bin/env python3
"""
Script to check for duplicate entries in the election_results table
and verify the homomorphic tally process for PostgreSQL database.
"""
import os
import sys
from collections import Counter
import psycopg2
from sqlalchemy import create_engine, text
import traceback

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def check_election_results_postgresql():
    """Check for duplicates in election_results table using direct PostgreSQL connection"""
    print("=" * 60)
    print("ELECTION RESULTS DUPLICATE DETECTION & TALLY VERIFICATION")
    print("=" * 60)
    
    # PostgreSQL connection parameters - adjust as needed
    DATABASE_CONFIG = {
        'host': 'localhost',
        'port': '5432', 
        'database': 'phoniphaleia_db',
        'user': 'postgres',
        'password': 'password'
    }
    
    try:
        # Create SQLAlchemy engine for PostgreSQL
        db_url = f"postgresql://{DATABASE_CONFIG['user']}:{DATABASE_CONFIG['password']}@{DATABASE_CONFIG['host']}:{DATABASE_CONFIG['port']}/{DATABASE_CONFIG['database']}"
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            print(f"✅ Connected to PostgreSQL database: {DATABASE_CONFIG['database']}")
            
            # Check election_results table
            print(f"\n=== Election Results Table Analysis ===")
            
            # Get all election results with candidate info
            results_query = text("""
                SELECT 
                    er.result_id,
                    er.election_id,
                    er.candidate_id,
                    er.vote_count,
                    er.encrypted_vote_total,
                    er.created_at,
                    er.updated_at,
                    c.fullname as candidate_name,
                    e.election_name
                FROM election_results er
                LEFT JOIN candidates c ON er.candidate_id = c.candidate_id
                LEFT JOIN elections e ON er.election_id = e.election_id
                ORDER BY er.election_id, er.candidate_id
            """)
            
            results = conn.execute(results_query).fetchall()
            print(f"Total entries in election_results table: {len(results)}")
            
            if not results:
                print("No election results found in database.")
                return
            
            # Display all results
            print("\nAll Election Results:")
            for r in results:
                encrypted_preview = r.encrypted_vote_total[:50] + '...' if r.encrypted_vote_total else 'None'
                print(f"  Result ID: {r.result_id}")
                print(f"  Election: {r.election_id} ({r.election_name or 'Unknown'})")
                print(f"  Candidate: {r.candidate_id} ({r.candidate_name or 'Unknown'})")
                print(f"  Vote Count: {r.vote_count}")
                print(f"  Encrypted Total: {encrypted_preview}")
                print(f"  Created: {r.created_at}")
                print(f"  Updated: {r.updated_at}")
                print("  " + "-" * 50)
            
            # Check for duplicates by candidate_id within elections
            print(f"\n=== Duplicate Detection ===")
            
            duplicate_query = text("""
                SELECT 
                    election_id,
                    candidate_id,
                    COUNT(*) as entry_count,
                    STRING_AGG(result_id::text, ', ') as result_ids
                FROM election_results 
                GROUP BY election_id, candidate_id 
                HAVING COUNT(*) > 1
            """)
            
            duplicates = conn.execute(duplicate_query).fetchall()
            
            if duplicates:
                print(f"🚨 DUPLICATES FOUND: {len(duplicates)} duplicate candidate entries")
                for dup in duplicates:
                    # Get candidate name
                    candidate_query = text("SELECT fullname FROM candidates WHERE candidate_id = :cid")
                    candidate_result = conn.execute(candidate_query, {"cid": dup.candidate_id}).fetchone()
                    candidate_name = candidate_result.fullname if candidate_result else "Unknown"
                    
                    print(f"\n  ⚠️  Election {dup.election_id}, Candidate {dup.candidate_id} ({candidate_name}):")
                    print(f"      Has {dup.entry_count} entries (Result IDs: {dup.result_ids})")
                    
                    # Show details of each duplicate entry
                    detail_query = text("""
                        SELECT result_id, vote_count, created_at, updated_at 
                        FROM election_results 
                        WHERE election_id = :eid AND candidate_id = :cid
                        ORDER BY created_at
                    """)
                    details = conn.execute(detail_query, {"eid": dup.election_id, "cid": dup.candidate_id}).fetchall()
                    
                    for i, detail in enumerate(details, 1):
                        print(f"        Entry {i}: Result ID {detail.result_id}, Votes: {detail.vote_count}, Created: {detail.created_at}")
            else:
                print("✅ No duplicates found in election_results table")
            
            # Analyze by election
            print(f"\n=== Analysis by Election ===")
            election_query = text("""
                SELECT DISTINCT er.election_id, e.election_name, e.election_status
                FROM election_results er
                LEFT JOIN elections e ON er.election_id = e.election_id
                ORDER BY er.election_id
            """)
            
            elections = conn.execute(election_query).fetchall()
            
            for election in elections:
                election_results_query = text("""
                    SELECT er.candidate_id, er.vote_count, c.fullname
                    FROM election_results er
                    LEFT JOIN candidates c ON er.candidate_id = c.candidate_id
                    WHERE er.election_id = :eid
                    ORDER BY er.candidate_id
                """)
                
                election_results = conn.execute(election_results_query, {"eid": election.election_id}).fetchall()
                
                print(f"\nElection {election.election_id} ({election.election_name or 'Unknown'}):")
                print(f"  Status: {election.election_status or 'Unknown'}")
                print(f"  Results entries: {len(election_results)}")
                
                # Check for duplicates within this election
                candidate_counts = Counter(r.candidate_id for r in election_results)
                election_duplicates = {cid: count for cid, count in candidate_counts.items() if count > 1}
                
                if election_duplicates:
                    print(f"  🚨 Duplicates in this election: {election_duplicates}")
                else:
                    print(f"  ✅ No duplicates in this election")
                
                # Show candidate breakdown
                unique_candidates = {}
                for r in election_results:
                    if r.candidate_id not in unique_candidates:
                        unique_candidates[r.candidate_id] = {'name': r.fullname, 'total_votes': 0, 'entries': 0}
                    unique_candidates[r.candidate_id]['total_votes'] += (r.vote_count or 0)
                    unique_candidates[r.candidate_id]['entries'] += 1
                
                for cid, data in unique_candidates.items():
                    entry_note = f" ({data['entries']} entries)" if data['entries'] > 1 else ""
                    print(f"    Candidate {cid} ({data['name'] or 'Unknown'}): {data['total_votes']} votes{entry_note}")
            
            # Compare with votes table
            print(f"\n=== Votes Table Comparison ===")
            votes_query = text("""
                SELECT 
                    v.candidate_id,
                    COUNT(*) as vote_count,
                    c.fullname as candidate_name
                FROM votes v
                LEFT JOIN candidates c ON v.candidate_id = c.candidate_id
                GROUP BY v.candidate_id, c.fullname
                ORDER BY v.candidate_id
            """)
            
            vote_counts = conn.execute(votes_query).fetchall()
            print(f"Vote distribution by candidate (from votes table):")
            
            if vote_counts:
                for vote_data in vote_counts:
                    print(f"  Candidate {vote_data.candidate_id} ({vote_data.candidate_name or 'Unknown'}): {vote_data.vote_count} votes")
                
                # Compare votes vs results
                print(f"\n=== Vote Count Verification ===")
                for vote_data in vote_counts:
                    cid = vote_data.candidate_id
                    actual_votes = vote_data.vote_count
                    
                    # Get result entries for this candidate
                    result_query = text("""
                        SELECT election_id, vote_count, result_id
                        FROM election_results 
                        WHERE candidate_id = :cid
                        ORDER BY election_id
                    """)
                    
                    result_entries = conn.execute(result_query, {"cid": cid}).fetchall()
                    
                    if not result_entries:
                        print(f"  ⚠️  Candidate {cid}: {actual_votes} votes but NO result entry")
                    elif len(result_entries) == 1:
                        result_count = result_entries[0].vote_count or 0
                        if result_count == actual_votes:
                            print(f"  ✅ Candidate {cid}: {actual_votes} votes = {result_count} result ✓")
                        else:
                            print(f"  🚨 Candidate {cid}: {actual_votes} votes ≠ {result_count} result ✗")
                    else:
                        total_result_count = sum(r.vote_count or 0 for r in result_entries)
                        print(f"  🚨 Candidate {cid}: {actual_votes} votes vs {len(result_entries)} result entries (total: {total_result_count})")
                        for i, r in enumerate(result_entries, 1):
                            print(f"      Entry {i}: {r.vote_count or 0} votes (Result ID: {r.result_id}, Election: {r.election_id})")
            else:
                print("  No votes found in votes table")
            
            # Summary and recommendations
            print(f"\n=== Summary and Recommendations ===")
            if duplicates:
                print("🚨 ACTION REQUIRED: Duplicate entries detected in election_results table")
                print("   Recommendations:")
                print("   1. Use ElectionResult.cleanup_duplicates(election_id) to remove duplicates")
                print("   2. Investigate why duplicates were created (check tally_election logic)")
                print("   3. Verify the unique constraint is properly enforced")
                
                # Show cleanup commands for each affected election
                affected_elections = set(dup.election_id for dup in duplicates)
                for election_id in affected_elections:
                    print(f"   Cleanup command: ElectionResult.cleanup_duplicates({election_id})")
                
                # Show SQL commands to manually fix duplicates
                print("\n   Manual cleanup SQL commands:")
                for dup in duplicates:
                    print(f"   -- For Election {dup.election_id}, Candidate {dup.candidate_id}:")
                    print(f"   -- Keep the latest entry and delete older ones")
                    print(f"   DELETE FROM election_results")
                    print(f"   WHERE election_id = {dup.election_id} AND candidate_id = {dup.candidate_id}")
                    print(f"   AND result_id NOT IN (")
                    print(f"       SELECT result_id FROM election_results")
                    print(f"       WHERE election_id = {dup.election_id} AND candidate_id = {dup.candidate_id}")
                    print(f"       ORDER BY created_at DESC LIMIT 1")
                    print(f"   );")
                    print()
            else:
                print("✅ GOOD: No duplicate entries found")
                print("   The election results table appears to be clean")
            
            print(f"\nScript completed successfully.")
    
    except Exception as e:
        print(f"❌ Error running script: {e}")
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    try:
        success = check_election_results_postgresql()
        if success:
            print("\n🎉 Analysis completed successfully!")
        else:
            print("\n💥 Analysis failed. Check error messages above.")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⚠️ Script interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        traceback.print_exc()
        sys.exit(1)
