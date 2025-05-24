#!/usr/bin/env python3
"""
Script to verify the homomorphic tally process and check for issues
in the election results computation.
"""
import os
import sys
import json
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
    from app.models.crypto_config import CryptoConfig
    
    # Try to import paillier if available
    try:
        import paillier
        PAILLIER_AVAILABLE = True
    except ImportError:
        PAILLIER_AVAILABLE = False
        print("⚠️  Warning: paillier library not available. Cannot verify homomorphic operations.")
    
    def verify_homomorphic_tally(election_id):
        """Verify the homomorphic tally process for a specific election"""
        print(f"\n=== Verifying Homomorphic Tally for Election {election_id} ===")
        
        app = create_app()
        with app.app_context():
            # Get election info
            election = Election.query.get(election_id)
            if not election:
                print(f"❌ Election {election_id} not found")
                return False
            
            print(f"Election: {election.election_name}")
            print(f"Status: {election.election_status}")
            
            # Get all votes for this election
            votes = Vote.query.filter_by(election_id=election_id).all()
            print(f"Total votes found: {len(votes)}")
            
            if not votes:
                print("❌ No votes found for this election")
                return False
            
            # Analyze vote distribution
            vote_distribution = Counter(v.candidate_id for v in votes)
            print(f"Vote distribution by candidate:")
            for candidate_id, count in vote_distribution.items():
                candidate = Candidate.query.get(candidate_id)
                candidate_name = candidate.fullname if candidate else "Unknown"
                print(f"  Candidate {candidate_id} ({candidate_name}): {count} votes")
            
            # Get election results
            results = ElectionResult.query.filter_by(election_id=election_id).all()
            print(f"Election result entries: {len(results)}")
            
            # Check for duplicates in results
            result_candidate_counts = Counter(r.candidate_id for r in results)
            duplicates = {cid: count for cid, count in result_candidate_counts.items() if count > 1}
            
            if duplicates:
                print(f"🚨 DUPLICATES DETECTED: {duplicates}")
                for cid, count in duplicates.items():
                    candidate = Candidate.query.get(cid)
                    candidate_name = candidate.fullname if candidate else "Unknown"
                    print(f"  Candidate {cid} ({candidate_name}): {count} duplicate entries")
                    
                    # Show all entries for this candidate
                    dup_results = ElectionResult.query.filter_by(
                        election_id=election_id, 
                        candidate_id=cid
                    ).all()
                    for dr in dup_results:
                        print(f"    Result ID {dr.result_id}: vote_count={dr.vote_count}, created={dr.created_at}")
                return False
            else:
                print("✅ No duplicates in election results")
            
            # Verify vote counts match
            print(f"\n=== Vote Count Verification ===")
            all_match = True
            for candidate_id, expected_votes in vote_distribution.items():
                result_entry = ElectionResult.query.filter_by(
                    election_id=election_id,
                    candidate_id=candidate_id
                ).first()
                
                candidate = Candidate.query.get(candidate_id)
                candidate_name = candidate.fullname if candidate else "Unknown"
                
                if not result_entry:
                    print(f"❌ Candidate {candidate_id} ({candidate_name}): {expected_votes} votes but NO result entry")
                    all_match = False
                elif result_entry.vote_count != expected_votes:
                    print(f"❌ Candidate {candidate_id} ({candidate_name}): expected {expected_votes} votes, got {result_entry.vote_count}")
                    all_match = False
                else:
                    print(f"✅ Candidate {candidate_id} ({candidate_name}): {expected_votes} votes ✓")
            
            # Check if we can verify homomorphic operations
            if PAILLIER_AVAILABLE:
                print(f"\n=== Homomorphic Tally Verification ===")
                try:
                    # Get crypto config
                    crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
                    if not crypto_config:
                        print("❌ No crypto config found for this election")
                        return all_match
                    
                    # Get public key
                    public_key_data = json.loads(crypto_config.public_key)
                    pubkey = paillier.PaillierPublicKey(n=int(public_key_data.get('n')))
                    print(f"✅ Loaded public key (n={pubkey.n.bit_length()} bits)")
                    
                    # Group encrypted votes by candidate and verify homomorphic addition
                    for candidate_id, expected_count in vote_distribution.items():
                        candidate_votes = [v for v in votes if v.candidate_id == candidate_id]
                        print(f"\nCandidate {candidate_id}: Processing {len(candidate_votes)} encrypted votes")
                        
                        # Simulate homomorphic addition
                        enc_sum = None
                        valid_votes = 0
                        for i, vote in enumerate(candidate_votes):
                            try:
                                enc_vote = paillier.EncryptedNumber(pubkey, int(vote.encrypted_vote), 0)
                                if enc_sum is None:
                                    enc_sum = enc_vote
                                else:
                                    enc_sum = enc_sum + enc_vote
                                valid_votes += 1
                            except Exception as e:
                                print(f"    ⚠️  Error processing vote {i}: {e}")
                        
                        print(f"    Successfully processed {valid_votes}/{len(candidate_votes)} encrypted votes")
                        
                        # Compare with stored encrypted total
                        result_entry = ElectionResult.query.filter_by(
                            election_id=election_id,
                            candidate_id=candidate_id
                        ).first()
                        
                        if result_entry and result_entry.encrypted_vote_total:
                            stored_encrypted = result_entry.encrypted_vote_total
                            computed_encrypted = str(enc_sum.ciphertext()) if enc_sum else None
                            
                            if stored_encrypted == computed_encrypted:
                                print(f"    ✅ Stored encrypted total matches computed total")
                            else:
                                print(f"    ❌ Stored encrypted total does NOT match computed total")
                                print(f"        Stored:   {stored_encrypted[:50]}...")
                                print(f"        Computed: {computed_encrypted[:50] if computed_encrypted else 'None'}...")
                                all_match = False
                        else:
                            print(f"    ⚠️  No stored encrypted total found")
                
                except Exception as e:
                    print(f"❌ Error during homomorphic verification: {e}")
                    import traceback
                    traceback.print_exc()
            
            return all_match
    
    def check_all_elections():
        """Check all elections for tally issues"""
        print("=" * 60)
        print("HOMOMORPHIC TALLY VERIFICATION FOR ALL ELECTIONS")
        print("=" * 60)
        
        app = create_app()
        with app.app_context():
            # Get all elections that have results
            elections_with_results = db.session.query(ElectionResult.election_id).distinct().all()
            election_ids = [er[0] for er in elections_with_results]
            
            if not election_ids:
                print("No elections with results found.")
                return
            
            print(f"Found {len(election_ids)} elections with results: {election_ids}")
            
            all_good = True
            for election_id in election_ids:
                result = verify_homomorphic_tally(election_id)
                if not result:
                    all_good = False
                print("-" * 50)
            
            print(f"\n=== FINAL SUMMARY ===")
            if all_good:
                print("✅ ALL ELECTIONS PASSED VERIFICATION")
            else:
                print("🚨 ISSUES DETECTED - Some elections failed verification")
                print("   Please review the output above and fix any duplicate or inconsistent results")
    
    if __name__ == "__main__":
        # You can specify an election ID to check just one election
        # or run without arguments to check all elections
        if len(sys.argv) > 1:
            try:
                election_id = int(sys.argv[1])
                print(f"Checking specific election: {election_id}")
                verify_homomorphic_tally(election_id)
            except ValueError:
                print("Invalid election ID. Please provide a numeric election ID.")
                sys.exit(1)
        else:
            check_all_elections()

except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Make sure you're running this script from the backend directory")
    sys.exit(1)
except Exception as e:
    print(f"Error running script: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
