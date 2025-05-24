#!/usr/bin/env python3

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.crypto_config import CryptoConfig
from app.models.key_share import KeyShare
from app.models.trusted_authority import TrustedAuthority

def check_election_55_key_shares():
    """Check what key shares are actually stored for election 55"""
    
    app = create_app()
    with app.app_context():
        print("=== CHECKING KEY SHARES FOR ELECTION 55 ===")
        
        # Get crypto config for election 55
        crypto_config = CryptoConfig.query.filter_by(election_id=55).first()
        if not crypto_config:
            print("❌ No crypto config found for election 55")
            return
        
        print(f"✓ Found crypto config ID: {crypto_config.crypto_id}")
        
        # Get key shares for this crypto config
        key_shares = KeyShare.query.filter_by(crypto_id=crypto_config.crypto_id).all()
        print(f"✓ Found {len(key_shares)} key shares")
        
        if len(key_shares) == 0:
            print("❌ No key shares found in database for election 55!")
            print("This explains why the txt files don't match - there are no shares stored!")
            return
        
        print("\n=== KEY SHARES IN DATABASE ===")
        for i, share in enumerate(key_shares):
            authority = TrustedAuthority.query.get(share.authority_id)
            authority_name = authority.authority_name if authority else f'Unknown (ID: {share.authority_id})'
            
            print(f"\nShare {i+1}:")
            print(f"  Authority ID: {share.authority_id}")
            print(f"  Authority Name: {authority_name}")
            print(f"  Share Value (first 50 chars): {share.share_value[:50]}...")
            print(f"  Share Value (last 50 chars): ...{share.share_value[-50:]}")
            print(f"  Full length: {len(share.share_value)} characters")
            print(f"  Created at: {share.created_at}")
        
        # Check if these are the expected authorities
        print("\n=== AUTHORITY VERIFICATION ===")
        expected_authorities = ['Harold Personnel 1', 'Bao Personnel 2', 'Heaven Personnel 3']
        actual_authorities = []
        
        for share in key_shares:
            authority = TrustedAuthority.query.get(share.authority_id)
            if authority:
                actual_authorities.append(authority.authority_name)
                if authority.authority_name in expected_authorities:
                    print(f"✓ Found expected authority: {authority.authority_name}")
                else:
                    print(f"⚠️  Unexpected authority: {authority.authority_name}")
            else:
                print(f"❌ Authority ID {share.authority_id} not found in database")
        
        # Check for missing expected authorities
        for expected in expected_authorities:
            if expected not in actual_authorities:
                print(f"❌ Missing expected authority: {expected}")
        
        print(f"\n=== SUMMARY ===")
        print(f"Expected authorities: {expected_authorities}")
        print(f"Actual authorities: {actual_authorities}")
        
        if len(key_shares) == 0:
            print("❌ CRITICAL ISSUE: No key shares stored in database for election 55")
            print("   This means the key generation/storage process failed")
        elif set(actual_authorities) == set(expected_authorities):
            print("✓ All expected authorities found with correct key shares")
        else:
            print("⚠️  Authority mismatch detected")

if __name__ == "__main__":
    check_election_55_key_shares()
