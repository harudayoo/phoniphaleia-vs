#!/usr/bin/env python3

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.crypto_config import CryptoConfig
from app.models.key_share import KeyShare
from app.models.trusted_authority import TrustedAuthority

def get_full_key_shares_election55():
    """Get the complete key shares from the database for election 55"""
    
    app = create_app()
    with app.app_context():
        print("=== EXTRACTING FULL KEY SHARES FOR ELECTION 55 ===")
        
        # Get crypto config for election 55
        crypto_config = CryptoConfig.query.filter_by(election_id=55).first()
        if not crypto_config:
            print("❌ No crypto config found for election 55")
            return []
        
        # Get key shares for this crypto config
        key_shares = KeyShare.query.filter_by(crypto_id=crypto_config.crypto_id).all()
        
        if len(key_shares) == 0:
            print("❌ No key shares found!")
            return []
        
        full_shares = []
        print(f"Found {len(key_shares)} key shares:")
        print()
        
        for i, share in enumerate(key_shares):
            authority = TrustedAuthority.query.get(share.authority_id)
            authority_name = authority.authority_name if authority else f'Unknown (ID: {share.authority_id})'
            
            print(f"Share {i+1} ({authority_name}):")
            print(f"  Full value: {share.share_value}")
            print(f"  Length: {len(share.share_value)} characters")
            print()
            
            full_shares.append(share.share_value)
        
        return full_shares

if __name__ == "__main__":
    shares = get_full_key_shares_election55()
    if shares:
        print("=== READY FOR API TEST ===")
        print("Copy these shares for the API test:")
        for i, share in enumerate(shares):
            print(f"'{share}',")
