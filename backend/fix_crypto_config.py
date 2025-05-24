#!/usr/bin/env python3
"""
Fix the problematic crypto configuration by updating the stored prime 
to match what the key shares actually reconstruct to.
"""

import os
import sys
import json

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Set required environment variables
os.environ.setdefault('SESSION_TIMEOUT_MINUTES', '30')
os.environ.setdefault('MAIL_PORT', '587')
os.environ.setdefault('MAIL_USE_TLS', 'True')
os.environ.setdefault('MAIL_USE_SSL', 'False')

from app import create_app, db
from app.models.crypto_config import CryptoConfig
from app.models.key_share import KeyShare
import shamirs

def fix_crypto_config(crypto_id=50, dry_run=True):
    """
    Fix the problematic crypto configuration.
    
    Args:
        crypto_id: The ID of the crypto config to fix
        dry_run: If True, show what would be changed without making changes
    """
    
    print(f"🔧 {'DRY RUN: ' if dry_run else ''}FIXING CRYPTO CONFIG {crypto_id}")
    print("=" * 60)
    
    app = create_app()
    with app.app_context():
        config = CryptoConfig.query.filter_by(crypto_id=crypto_id).first()
        if not config:
            print(f"❌ Crypto configuration {crypto_id} not found.")
            return False
            
        print(f'Found Crypto Config ID: {config.crypto_id} (Election: {config.election_id})')
        
        # Parse current metadata
        meta = json.loads(config.meta_data)
        security_data = meta.get('security_data', {})
        
        # Parse public key
        public_key_data = json.loads(config.public_key)
        n = int(public_key_data.get('n', 0))
        
        print(f'Public key n: {n}')
        
        # Get current stored values
        current_stored_p = int(security_data.get('prime', 0))
        current_q = n // current_stored_p if current_stored_p else 0
        
        print(f'\n📊 CURRENT VALUES:')
        print(f'  Currently stored p: {current_stored_p}')
        print(f'  Calculated q: {current_q}')
        print(f'  Verification: p × q = {current_stored_p * current_q} (should equal n={n})')
        print(f'  ✅ Current storage is mathematically valid: {current_stored_p * current_q == n}')
        
        # Get prime modulus for reconstruction
        prime_modulus = int(meta.get('prime_modulus') or security_data.get('prime_modulus'))
        
        # Reconstruct what the shares actually contain
        key_shares = KeyShare.query.filter_by(crypto_id=config.crypto_id).all()
        parsed_shares = []
        
        print(f'\n🔑 RECONSTRUCTING FROM {len(key_shares)} KEY SHARES:')
        for share in key_shares:
            share_str = share.share_value
            if ':' in share_str:
                x_str, y_hex = share_str.split(':', 1)
                x = int(x_str)
                y = int(y_hex, 16)
                share_obj = shamirs.share(x, y, prime_modulus)
                parsed_shares.append(share_obj)
        
        # Reconstruct the secret
        reconstructed_p = shamirs.interpolate(parsed_shares)
        reconstructed_q = n // reconstructed_p if n % reconstructed_p == 0 else 0
        
        print(f'  Reconstructed p: {reconstructed_p}')
        print(f'  Calculated q from reconstruction: {reconstructed_q}')
        print(f'  Verification: p × q = {reconstructed_p * reconstructed_q} (should equal n={n})')
        print(f'  ✅ Reconstruction is mathematically valid: {reconstructed_p * reconstructed_q == n}')
        
        # Compare stored vs reconstructed
        print(f'\n🔍 COMPARISON:')
        if current_stored_p == reconstructed_p:
            print(f'  ✅ Stored p matches reconstructed p - NO FIX NEEDED!')
            return True
        else:
            print(f'  ❌ MISMATCH DETECTED:')
            print(f'     Stored p:        {current_stored_p}')
            print(f'     Reconstructed p: {reconstructed_p}')
            print(f'     Difference:      {abs(current_stored_p - reconstructed_p)}')
            
            # Determine which is p and which is q based on size
            # (python-paillier uses the smaller prime as p)
            if reconstructed_p < current_stored_p:
                print(f'  📋 Reconstructed value is smaller → this should be p')
                print(f'  📋 Stored value is larger → this should be q')
                correct_p = reconstructed_p
                correct_q = current_stored_p
            else:
                print(f'  📋 Stored value is smaller → this should be p')
                print(f'  📋 Reconstructed value is larger → this should be q')
                correct_p = current_stored_p
                correct_q = reconstructed_p
            
            print(f'\n✅ PROPOSED FIX:')
            print(f'  Update stored p from {current_stored_p} to {correct_p}')
            print(f'  This will make stored p match what shares reconstruct to')
            print(f'  New p × q = {correct_p} × {correct_q} = {correct_p * correct_q}')
            
            if not dry_run:
                # Make the fix
                print(f'\n🔧 APPLYING FIX...')
                
                # Update the security_data
                security_data['prime'] = str(correct_p)
                
                # Also update p_times_q if it exists
                if 'p_times_q' in security_data:
                    security_data['p_times_q'] = str(correct_p * correct_q)
                
                # Update the metadata
                meta['security_data'] = security_data
                
                # Save back to database
                config.meta_data = json.dumps(meta)
                
                try:
                    db.session.commit()
                    print(f'  ✅ Successfully updated crypto config {crypto_id}')
                    
                    # Verify the fix
                    print(f'\n🔬 VERIFICATION:')
                    updated_meta = json.loads(config.meta_data)
                    updated_security = updated_meta.get('security_data', {})
                    new_stored_p = int(updated_security.get('prime', 0))
                    print(f'  New stored p: {new_stored_p}')
                    print(f'  Matches reconstructed p: {new_stored_p == reconstructed_p}')
                    
                    return True
                    
                except Exception as e:
                    print(f'  ❌ Error saving changes: {e}')
                    db.session.rollback()
                    return False
            else:
                print(f'\n💡 This is a DRY RUN - no changes made.')
                print(f'   Run with dry_run=False to apply the fix.')
                return True

if __name__ == "__main__":
    # First run in dry-run mode to show what would change
    print("Running in DRY RUN mode first...")
    success = fix_crypto_config(crypto_id=50, dry_run=True)
    
    if success:
        print("\n" + "="*60)
        response = input("Apply the fix? (y/N): ").strip().lower()
        if response == 'y':
            print("\nApplying the fix...")
            fix_crypto_config(crypto_id=50, dry_run=False)
        else:
            print("Fix not applied.")
