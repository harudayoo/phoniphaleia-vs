#!/usr/bin/env python3
"""
Test script to verify homomorphic tallying logic and duplicate prevention
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.election import Election
from app.models.vote import Vote
from app.models.election_result import ElectionResult
from app.models.crypto_config import CryptoConfig
from phe import paillier
import json
import logging
from collections import Counter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_homomorphic_tally_verification():
    """Test the homomorphic tally process and verify results"""
    print("=" * 80)
    print("HOMOMORPHIC TALLY VERIFICATION TEST")
    print("=" * 80)
    
    app = create_app()
    with app.app_context():
        # Find the most recent election with votes
        election = Election.query.order_by(Election.election_id.desc()).first()
        if not election:
            print("❌ No elections found")
            return False
            
        election_id = election.election_id
        print(f"🗳️  Testing with Election ID: {election_id}")
        
        # Get all votes for this election
        votes = Vote.query.filter_by(election_id=election_id).all()
        print(f"📊 Found {len(votes)} votes in the database")
        
        if not votes:
            print("❌ No votes found for this election")
            return False
        
        # Analyze vote distribution
        vote_distribution = Counter(v.candidate_id for v in votes)
        print(f"📈 Vote distribution by candidate: {dict(vote_distribution)}")
        
        # Get crypto config
        crypto_config = CryptoConfig.query.filter_by(election_id=election_id).first()
        if not crypto_config:
            print("❌ No crypto config found")
            return False
        
        # Parse public key
        public_key_data = json.loads(crypto_config.public_key)
        pubkey = paillier.PaillierPublicKey(n=int(public_key_data.get('n')))
        print(f"🔑 Loaded public key with n={pubkey.n.bit_length()} bits")
        
        # Group encrypted votes by candidate (simulate tally process)
        candidate_totals = {}
        for v in votes:
            if v.candidate_id not in candidate_totals:
                candidate_totals[v.candidate_id] = []
            candidate_totals[v.candidate_id].append(v.encrypted_vote)
        
        print(f"🔢 Grouped votes for {len(candidate_totals)} candidates")
        
        # Homomorphically add encrypted votes per candidate
        encrypted_results = {}
        for candidate_id, enc_votes in candidate_totals.items():
            print(f"🧮 Processing {len(enc_votes)} encrypted votes for candidate {candidate_id}")
            
            enc_sum = None
            for i, enc_vote in enumerate(enc_votes):
                try:
                    enc = paillier.EncryptedNumber(pubkey, int(enc_vote), 0)
                    if enc_sum is None:
                        enc_sum = enc
                    else:
                        enc_sum = enc_sum + enc
                except Exception as e:
                    print(f"❌ Error processing encrypted vote {i} for candidate {candidate_id}: {e}")
                    return False
            
            if enc_sum:
                encrypted_results[candidate_id] = str(enc_sum.ciphertext())
                print(f"✅ Homomorphic sum for candidate {candidate_id}: {str(enc_sum.ciphertext())[:50]}...")
        
        print(f"✅ Completed homomorphic tallying for {len(encrypted_results)} candidates")
        
        # Test duplicate detection in election_results table
        print(f"\n🔍 TESTING DUPLICATE DETECTION")
        print("-" * 50)
        
        existing_results = ElectionResult.query.filter_by(election_id=election_id).all()
        if existing_results:
            print(f"📋 Found {len(existing_results)} existing results in database")
            
            # Test duplicate detection method
            duplicates = ElectionResult.detect_duplicates(election_id)
            if duplicates:
                print(f"⚠️  Duplicates detected: {duplicates}")
            else:
                print("✅ No duplicates detected")
            
            # Test vote count accuracy
            print(f"\n📊 VERIFYING VOTE COUNT ACCURACY")
            print("-" * 50)
            
            for result in existing_results:
                actual_votes = len([v for v in votes if v.candidate_id == result.candidate_id])
                stored_votes = result.vote_count or 0
                
                if actual_votes == stored_votes:
                    print(f"✅ Candidate {result.candidate_id}: {actual_votes} votes (MATCH)")
                else:
                    print(f"❌ Candidate {result.candidate_id}: expected {actual_votes}, stored {stored_votes} (MISMATCH)")
                    return False
        else:
            print("📋 No existing results found in database")
        
        # Test upsert functionality
        print(f"\n🧪 TESTING UPSERT FUNCTIONALITY")
        print("-" * 50)
        
        test_candidate_id = list(encrypted_results.keys())[0] if encrypted_results else 999
        test_encrypted_total = encrypted_results.get(test_candidate_id, "12345")
        
        # First upsert (should create)
        try:
            result1, was_created1 = ElectionResult.upsert_result(
                election_id=election_id,
                candidate_id=test_candidate_id,
                encrypted_vote_total=test_encrypted_total
            )
            print(f"✅ First upsert: created={was_created1}")
            
            # Second upsert (should update)
            result2, was_created2 = ElectionResult.upsert_result(
                election_id=election_id,
                candidate_id=test_candidate_id,
                encrypted_vote_total=test_encrypted_total + "_updated"
            )
            print(f"✅ Second upsert: created={was_created2}")
            
            if was_created1 and not was_created2:
                print("✅ Upsert logic working correctly")
            else:
                print(f"❌ Upsert logic error: first={was_created1}, second={was_created2}")
                return False
                
            # Clean up test data
            if result2:
                db.session.delete(result2)
                db.session.commit()
                
        except Exception as e:
            print(f"❌ Upsert test failed: {e}")
            return False
        
        print(f"\n✅ ALL TESTS PASSED")
        print("=" * 80)
        return True

if __name__ == "__main__":
    success = test_homomorphic_tally_verification()
    if success:
        print("🎉 Homomorphic tally verification completed successfully!")
    else:
        print("💥 Homomorphic tally verification failed!")
        sys.exit(1)
