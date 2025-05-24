#!/usr/bin/env python3
"""
Script to validate the homomorphic tally process and detect any issues
"""
import sys
import os

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app import create_app, db
from app.models.vote import Vote
from app.models.election_result import ElectionResult
from app.models.candidate import Candidate
from app.models.election import Election
from app.models.crypto_config import CryptoConfig
from phe import paillier
from collections import Counter
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validate_election_tally(election_id):
    """Validate the tally process for a specific election"""
    print(f"\n=== Validating Tally for Election {election_id} ===")
    
    # Get election info
    election = Election.query.get(election_id)
    if not election:
        print(f"❌ Election {election_id} not found")
        return False
    
    print(f"📊 Election: {election.election_name}")
    print(f"📅 Status: {election.election_status}")
    
    # Check votes in database
    votes = Vote.query.filter_by(election_id=election_id).all()
    print(f"📝 Total votes in database: {len(votes)}")
    
    if not votes:
        print("❌ No votes found for this election")
        return False
    
    # Analyze vote distribution
    vote_distribution = Counter(v.candidate_id for v in votes)
    print(f"📈 Vote distribution by candidate: {dict(vote_distribution)}")
    
    # Check for candidate info
    candidates = Candidate.query.filter_by(election_id=election_id).all()
    print(f"👥 Candidates in election: {len(candidates)}")
    for c in candidates:
        print(f"   - {c.fullname} (ID: {c.candidate_id})")
    
    # Check election results
    results = ElectionResult.query.filter_by(election_id=election_id).all()
    print(f"📊 Election results in database: {len(results)}")
    
    if not results:
        print("❌ No election results found - tally may not have been run")
        return False
    
    # Check for duplicates
    result_distribution = Counter(r.candidate_id for r in results)
    duplicates = {cid: count for cid, count in result_distribution.items() if count > 1}
    
    if duplicates:
        print(f"❌ DUPLICATES DETECTED: {duplicates}")
        for candidate_id, count in duplicates.items():
            duplicate_results = ElectionResult.query.filter_by(
                election_id=election_id, 
                candidate_id=candidate_id
            ).all()
            print(f"   Candidate {candidate_id} has {count} result entries:")
            for r in duplicate_results:
                print(f"     - Result ID {r.result_id}: votes={r.vote_count}, created={r.created_at}")
        return False
    else:
        print("✅ No duplicates detected in election results")
    
    # Validate homomorphic tallying if crypto config exists
    crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
    if crypto_config:
        print("🔐 Crypto config found - validating homomorphic tally")
        return validate_homomorphic_tally(election_id, votes, results, crypto_config)
    else:
        print("❌ No crypto config found for this election")
        return False

def validate_homomorphic_tally(election_id, votes, results, crypto_config):
    """Validate the homomorphic tallying process"""
    try:
        # Parse public key
        public_key_data = json.loads(crypto_config.public_key)
        pubkey = paillier.PaillierPublicKey(n=int(public_key_data.get('n')))
        print(f"🔑 Public key loaded: {pubkey.n.bit_length()} bits")
        
        # Group votes by candidate (simulating tally process)
        candidate_totals = {}
        for v in votes:
            if v.candidate_id not in candidate_totals:
                candidate_totals[v.candidate_id] = []
            candidate_totals[v.candidate_id].append(v.encrypted_vote)
        
        print(f"📊 Homomorphic tally simulation:")
        for candidate_id, enc_votes in candidate_totals.items():
            print(f"   Candidate {candidate_id}: {len(enc_votes)} encrypted votes")
            
            # Simulate homomorphic addition
            enc_sum = None
            for enc_vote in enc_votes:
                enc = paillier.EncryptedNumber(pubkey, int(enc_vote), 0)
                if enc_sum is None:
                    enc_sum = enc
                else:
                    enc_sum = enc_sum + enc
            
            if enc_sum:
                print(f"   Homomorphic sum: {str(enc_sum.ciphertext())[:50]}...")
                
                # Compare with stored result
                stored_result = ElectionResult.query.filter_by(
                    election_id=election_id, 
                    candidate_id=candidate_id
                ).first()
                
                if stored_result and stored_result.encrypted_vote_total:
                    if str(enc_sum.ciphertext()) == stored_result.encrypted_vote_total:
                        print(f"   ✅ Stored encrypted total matches simulation")
                    else:
                        print(f"   ❌ Stored encrypted total does NOT match simulation")
                        print(f"      Expected: {str(enc_sum.ciphertext())[:50]}...")
                        print(f"      Stored:   {stored_result.encrypted_vote_total[:50]}...")
                        return False
                else:
                    print(f"   ❌ No stored encrypted total found for candidate {candidate_id}")
                    return False
        
        print("✅ Homomorphic tally validation passed")
        return True
        
    except Exception as e:
        print(f"❌ Error validating homomorphic tally: {e}")
        return False

def main():
    app = create_app()
    with app.app_context():
        print("🔍 Election Tally Validation Tool")
        
        # Get all elections with votes
        elections_with_votes = db.session.query(Vote.election_id).distinct().all()
        election_ids = [eid[0] for eid in elections_with_votes]
        
        print(f"\n📋 Found {len(election_ids)} elections with votes: {election_ids}")
        
        if not election_ids:
            print("❌ No elections with votes found")
            return
        
        # Validate each election
        all_valid = True
        for election_id in election_ids:
            is_valid = validate_election_tally(election_id)
            if not is_valid:
                all_valid = False
        
        print(f"\n{'='*60}")
        if all_valid:
            print("✅ All elections passed validation")
        else:
            print("❌ Some elections failed validation")
            print("\nTo fix duplicate issues, run:")
            print("  - Check duplicates: GET /api/debug/election-results/<election_id>/duplicates")
            print("  - Clean duplicates: POST /api/debug/election-results/<election_id>/cleanup")

if __name__ == "__main__":
    main()
