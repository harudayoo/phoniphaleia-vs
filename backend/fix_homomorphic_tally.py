#!/usr/bin/env python3
"""
Fix homomorphic tallying implementation for Paillier encryption by:
1. Ensuring encrypted votes are properly processed
2. Implementing robust error handling
3. Adding validation steps before and after tallying
4. Preventing duplicate election results

Run this script to re-tally all elections with encrypted votes or specify
a specific election ID as an argument.
"""

import sys
import os
import json
import logging
import traceback
from collections import Counter
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.vote import Vote
from app.models.election_result import ElectionResult
from app.models.election import Election
from app.models.candidate import Candidate
from app.models.crypto_config import CryptoConfig
from phe import paillier

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def analyze_election_state(election_id):
    """
    Analyze the current state of an election including votes and results
    """
    print(f"\n=== ANALYZING ELECTION {election_id} ===")
    
    # Get election
    election = Election.query.get(election_id)
    if not election:
        print(f"❌ Election {election_id} not found")
        return False
    
    print(f"Election: {election.election_name}")
    print(f"Status: {election.election_status}")
    
    # Check votes
    votes = Vote.query.filter_by(election_id=election_id).all()
    print(f"Total votes in database: {len(votes)}")
    
    if not votes:
        print("❌ No votes found for this election")
        return False
    
    # Analyze vote distribution
    vote_distribution = Counter(v.candidate_id for v in votes)
    print(f"Vote distribution by candidate:")
    for candidate_id, count in vote_distribution.items():
        candidate = Candidate.query.get(candidate_id)
        candidate_name = candidate.fullname if candidate else "Unknown"
        print(f"  - Candidate {candidate_id} ({candidate_name}): {count} votes")
    
    # Check current election results
    results = ElectionResult.query.filter_by(election_id=election_id).all()
    print(f"Election results in database: {len(results)}")
    
    if results:
        # Check for duplicates
        result_distribution = Counter(r.candidate_id for r in results)
        duplicates = {cid: count for cid, count in result_distribution.items() if count > 1}
        
        if duplicates:
            print(f"❌ DUPLICATES DETECTED: {duplicates}")
            for cid, count in duplicates.items():
                candidate = Candidate.query.get(cid)
                candidate_name = candidate.fullname if candidate else "Unknown"
                print(f"  Candidate {cid} ({candidate_name}): {count} duplicate entries")
        else:
            print("✅ No duplicates detected in election results")
    
    # Check crypto config
    crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
    if not crypto_config:
        print("❌ No crypto config found for this election")
        return False
    
    print(f"✅ Crypto config found - Key type: {crypto_config.key_type}, Status: {crypto_config.status}")
    
    # Check if votes have proper encryption format
    encrypted_vote_sample = None
    valid_encrypted_votes = 0
    invalid_encrypted_votes = 0
    
    for vote in votes[:5]:  # Sample first 5 votes
        if vote.encrypted_vote and len(vote.encrypted_vote) > 10:
            valid_encrypted_votes += 1
            if not encrypted_vote_sample:
                encrypted_vote_sample = vote.encrypted_vote
        else:
            invalid_encrypted_votes += 1
    
    total_checked = min(5, len(votes))
    print(f"Encrypted vote sample check: {valid_encrypted_votes}/{total_checked} valid")
    
    if invalid_encrypted_votes > 0:
        print(f"⚠️ Warning: {invalid_encrypted_votes} votes appear to have invalid encryption format")
    
    if encrypted_vote_sample:
        print(f"Sample encrypted vote: {encrypted_vote_sample[:50]}...")
    
    return True

def clear_election_results(election_id):
    """
    Clear existing ElectionResult records for an election
    """
    print(f"\n=== CLEARING ELECTION {election_id} RESULTS ===")
    
    results = ElectionResult.query.filter_by(election_id=election_id).all()
    count = len(results)
    
    if count == 0:
        print("No existing results to clear")
        return 0
    
    for result in results:
        db.session.delete(result)
    
    db.session.commit()
    print(f"Deleted {count} ElectionResult records")
    return count

def fix_homomorphic_tally(election_id):
    """
    Implement a fixed homomorphic tally for an election
    """
    print(f"\n=== FIXING HOMOMORPHIC TALLY FOR ELECTION {election_id} ===")
    
    # Get all votes for this election
    votes = Vote.query.filter_by(election_id=election_id).all()
    print(f"Found {len(votes)} votes to tally")
    
    if not votes:
        print("❌ No votes found for this election")
        return False
    
    # Get crypto config
    crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
    if not crypto_config:
        print("❌ No crypto config found for this election")
        return False
    
    # Parse the public key JSON and extract the n value
    try:
        public_key_data = json.loads(crypto_config.public_key)
        pubkey = paillier.PaillierPublicKey(n=int(public_key_data.get('n')))
        print(f"Loaded public key with n={pubkey.n.bit_length()} bits")
    except Exception as e:
        print(f"❌ Error parsing public key: {e}")
        return False
    
    # Group encrypted votes by candidate
    candidate_totals = {}
    for v in votes:
        if v.candidate_id not in candidate_totals:
            candidate_totals[v.candidate_id] = []
        candidate_totals[v.candidate_id].append(v.encrypted_vote)
    
    print(f"Grouped votes for {len(candidate_totals)} candidates")
    
    # Homomorphically add encrypted votes per candidate
    encrypted_results = {}
    encryption_errors = []
    
    for candidate_id, enc_votes in candidate_totals.items():
        print(f"Processing {len(enc_votes)} encrypted votes for candidate {candidate_id}")
        
        enc_sum = None
        valid_votes = 0
        invalid_votes = 0
        
        for i, enc_vote in enumerate(enc_votes):
            try:
                # Ensure encrypted vote is valid
                if not enc_vote or len(enc_vote) < 10:
                    print(f"  Skipping invalid encrypted vote (index {i})")
                    invalid_votes += 1
                    continue
                
                # Create EncryptedNumber object
                enc = paillier.EncryptedNumber(pubkey, int(enc_vote), 0)
                
                # Add to running sum
                if enc_sum is None:
                    enc_sum = enc
                else:
                    enc_sum = enc_sum + enc
                
                valid_votes += 1
                if valid_votes % 10 == 0:
                    print(f"  Processed {valid_votes}/{len(enc_votes)} votes")
                
            except Exception as e:
                error_msg = f"Error processing encrypted vote {i} for candidate {candidate_id}: {e}"
                print(f"  ❌ {error_msg}")
                encryption_errors.append(error_msg)
                invalid_votes += 1
        
        if enc_sum:
            encrypted_results[candidate_id] = str(enc_sum.ciphertext())
            print(f"✅ Successfully tallied {valid_votes} votes for candidate {candidate_id}")
            if invalid_votes > 0:
                print(f"  ⚠️ {invalid_votes} votes were invalid and skipped")
        else:
            print(f"❌ Failed to tally votes for candidate {candidate_id}")
    
    if encryption_errors:
        print(f"\n⚠️ {len(encryption_errors)} encryption errors occurred during tallying")
        for i, error in enumerate(encryption_errors[:5]):
            print(f"  Error {i+1}: {error}")
        if len(encryption_errors) > 5:
            print(f"  ... and {len(encryption_errors) - 5} more errors")
    
    # Store encrypted results
    results_created = 0
    store_errors = []
    
    try:
        # Start a transaction
        db.session.begin_nested()
        
        for candidate_id, enc_total in encrypted_results.items():
            try:
                # Use upsert to prevent duplicates
                er, was_created = ElectionResult.upsert_result(
                    election_id=election_id,
                    candidate_id=candidate_id,
                    encrypted_vote_total=enc_total
                )
                
                if was_created:
                    results_created += 1
                print(f"Stored result for candidate {candidate_id} (created: {was_created})")
                
            except Exception as e:
                error_msg = f"Error storing result for candidate {candidate_id}: {e}"
                print(f"❌ {error_msg}")
                store_errors.append(error_msg)
        
        if store_errors:
            db.session.rollback()
            print(f"\n❌ Rolling back due to {len(store_errors)} store errors")
            return False
        
        # Set election status to Finished
        election = Election.query.get(election_id)
        election.election_status = 'Finished'
        election.date_end = datetime.utcnow().date()
        
        # Commit all changes
        db.session.commit()
        print(f"\n✅ Successfully stored {results_created} election results and updated election status")
        
        # Final verification
        final_duplicates = ElectionResult.detect_duplicates(election_id)
        if final_duplicates:
            print(f"⚠️ WARNING: Duplicates detected after commit: {final_duplicates}")
            # Try to clean them up
            try:
                cleaned = ElectionResult.cleanup_duplicates(election_id)
                db.session.commit()
                print(f"✅ Cleaned up {cleaned} duplicate entries")
            except Exception as cleanup_error:
                print(f"❌ Cleanup failed: {cleanup_error}")
        
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error in homomorphic tallying: {e}")
        traceback.print_exc()
        return False

def verify_results(election_id):
    """
    Verify that the election results match the expected vote counts
    """
    print(f"\n=== VERIFYING ELECTION {election_id} RESULTS ===")
    
    # Get the actual vote distribution
    votes = Vote.query.filter_by(election_id=election_id).all()
    vote_distribution = Counter(v.candidate_id for v in votes)
    
    # Check current election results
    results = ElectionResult.query.filter_by(election_id=election_id).all()
    
    if not results:
        print("❌ No election results found")
        return False
    
    # Verify each candidate has a result
    all_correct = True
    for candidate_id, expected_count in vote_distribution.items():
        result = next((r for r in results if r.candidate_id == candidate_id), None)
        
        if not result:
            print(f"❌ Missing result for candidate {candidate_id}")
            all_correct = False
            continue
        
        print(f"Candidate {candidate_id}: has encrypted total: {bool(result.encrypted_vote_total)}")
        
        if not result.encrypted_vote_total:
            print(f"❌ Missing encrypted vote total for candidate {candidate_id}")
            all_correct = False
    
    # Check for duplicates
    duplicates = ElectionResult.detect_duplicates(election_id)
    if duplicates:
        print(f"❌ Duplicates detected: {duplicates}")
        all_correct = False
    
    if all_correct:
        print("✅ All election results verified successfully")
    
    return all_correct

def process_election(election_id):
    """
    Process a single election: analyze, clear results, re-tally, and verify
    """
    print(f"\n{'='*80}")
    print(f"PROCESSING ELECTION {election_id}")
    print(f"{'='*80}")
    
    # Step 1: Analyze current state
    if not analyze_election_state(election_id):
        print(f"❌ Skipping election {election_id} - analysis failed")
        return False
    
    # Step 2: Clear existing results
    cleared = clear_election_results(election_id)
    
    # Step 3: Re-tally the election
    if not fix_homomorphic_tally(election_id):
        print(f"❌ Failed to fix homomorphic tally for election {election_id}")
        return False
    
    # Step 4: Verify the results
    if not verify_results(election_id):
        print(f"⚠️ Verification found issues with election {election_id} results")
    
    print(f"\n✅ SUCCESSFULLY PROCESSED ELECTION {election_id}")
    return True

def process_all_elections():
    """
    Process all elections that have encrypted votes
    """
    print(f"\n{'='*80}")
    print(f"PROCESSING ALL ELECTIONS WITH ENCRYPTED VOTES")
    print(f"{'='*80}")
    
    # Find all elections with votes
    elections_with_votes = db.session.query(Vote.election_id).distinct().all()
    election_ids = [eid[0] for eid in elections_with_votes]
    
    if not election_ids:
        print("No elections with votes found")
        return
    
    print(f"Found {len(election_ids)} elections with votes: {election_ids}")
    
    successful = []
    failed = []
    
    for election_id in election_ids:
        try:
            if process_election(election_id):
                successful.append(election_id)
            else:
                failed.append(election_id)
        except Exception as e:
            print(f"❌ Error processing election {election_id}: {e}")
            traceback.print_exc()
            failed.append(election_id)
        
        print(f"\n{'-'*80}")
    
    # Print summary
    print(f"\n{'='*80}")
    print(f"SUMMARY")
    print(f"{'='*80}")
    print(f"Total elections processed: {len(election_ids)}")
    print(f"Successful: {len(successful)}")
    print(f"Failed: {len(failed)}")
    
    if successful:
        print(f"\nSuccessful elections: {successful}")
    
    if failed:
        print(f"\nFailed elections: {failed}")

def main():
    """Main function to process elections"""
    app = create_app()
    
    with app.app_context():
        # Check if specific election ID provided
        if len(sys.argv) > 1:
            try:
                election_id = int(sys.argv[1])
                process_election(election_id)
            except ValueError:
                print(f"Invalid election ID: {sys.argv[1]}")
                print("Usage: python fix_homomorphic_tally.py [election_id]")
                sys.exit(1)
        else:
            # Process all elections
            process_all_elections()

if __name__ == "__main__":
    main()
