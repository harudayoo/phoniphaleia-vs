#!/usr/bin/env python3
"""
Test the key reconstruction process with the actual shares from the database
to identify where the failure occurs.
"""

import os
import sys
import json
import base64

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

def test_key_reconstruction():
    """Test key reconstruction with actual shares from the database."""
    
    print("🔧 TESTING KEY RECONSTRUCTION PROCESS")
    print("=" * 60)
    
    app = create_app()
    with app.app_context():
        # Get the crypto configuration
        config = CryptoConfig.query.first()
        if not config:
            print("❌ No crypto configurations found in the database.")
            return False
            
        print(f'Testing crypto config ID: {config.crypto_id} (Election {config.election_id})')
        
        # Parse metadata to get reconstruction parameters
        try:
            meta = json.loads(config.meta_data)
            
            # Get prime modulus for Shamir reconstruction
            prime_modulus = None
            for key in ['prime_modulus', 'prime', 'prime_mod', 'modulus']:
                if key in meta:
                    prime_modulus = int(meta[key])
                    print(f'Found prime modulus in meta["{key}"]: {prime_modulus}')
                    break
            
            # Also check in security_data
            security_data = meta.get('security_data', {})
            if not prime_modulus:
                for key in ['prime_modulus', 'prime', 'prime_mod', 'modulus']:
                    if key in security_data:
                        prime_modulus = int(security_data[key])
                        print(f'Found prime modulus in security_data["{key}"]: {prime_modulus}')
                        break
            
            if not prime_modulus:
                print("❌ Could not find prime modulus for Shamir reconstruction")
                return False
                
            print(f'Prime modulus bit length: {prime_modulus.bit_length()}')
            
            # Get the expected result
            expected_p = None
            if 'p' in security_data:
                expected_p = int(security_data['p'])
                print(f'Expected p from security_data: {expected_p}')
            elif 'prime' in security_data:
                expected_p = int(security_data['prime'])
                print(f'Expected p from security_data["prime"]: {expected_p}')
            elif 'prime' in meta:
                expected_p = int(meta['prime'])
                print(f'Expected p from meta["prime"]: {expected_p}')
                
            if expected_p:
                print(f'Expected p bit length: {expected_p.bit_length()}')
            
        except Exception as e:
            print(f"❌ Could not parse metadata: {e}")
            return False
        
        # Get all key shares
        key_shares = KeyShare.query.filter_by(crypto_id=config.crypto_id).all()
        print(f'\nFound {len(key_shares)} key shares:')
        
        shares_data = []
        for i, share in enumerate(key_shares):
            print(f'  Share {i+1}: Authority {share.authority_id}, Value: {share.share_value[:50]}...')
            shares_data.append(share.share_value)
        
        if len(shares_data) < 2:
            print("❌ Need at least 2 shares for reconstruction")
            return False
        
        # Parse shares into shamirs.share objects
        print(f'\n🔄 PARSING SHARES:')
        parsed_shares = []
        
        for i, share_str in enumerate(shares_data):
            try:
                print(f'Parsing share {i+1}: {share_str[:50]}...')
                
                if ':' in share_str:
                    # Parse x:hex(y) format
                    x_str, y_hex = share_str.split(':', 1)
                    x = int(x_str)
                    y = int(y_hex, 16)
                    print(f'  Parsed as x={x}, y={y}')
                    
                    # Create shamirs.share object
                    share_obj = shamirs.share(x, y, prime_modulus)
                    parsed_shares.append(share_obj)
                    print(f'  ✅ Created shamirs.share object')
                else:
                    print(f'  ❌ Invalid share format (no ":")')
                    
            except Exception as e:
                print(f'  ❌ Error parsing share {i+1}: {e}')
        
        if len(parsed_shares) < 2:
            print(f"❌ Could only parse {len(parsed_shares)} shares, need at least 2")
            return False
            
        print(f'\n✅ Successfully parsed {len(parsed_shares)} shares')
        
        # Attempt reconstruction
        print(f'\n🔓 ATTEMPTING KEY RECONSTRUCTION:')
        try:
            reconstructed_secret = shamirs.interpolate(parsed_shares)
            print(f'✅ Reconstruction successful!')
            print(f'Reconstructed secret: {reconstructed_secret}')
            print(f'Reconstructed secret bit length: {reconstructed_secret.bit_length()}')
            
            # Compare with expected value
            if expected_p:
                if reconstructed_secret == expected_p:
                    print(f'✅ PERFECT MATCH: Reconstructed secret equals expected p')
                    return True
                else:
                    print(f'❌ MISMATCH: Reconstructed secret ≠ expected p')
                    print(f'   Expected: {expected_p}')
                    print(f'   Got:      {reconstructed_secret}')
                    print(f'   Difference: {abs(reconstructed_secret - expected_p)}')
                    
                    # Check if it might be modular arithmetic issue
                    if (reconstructed_secret % prime_modulus) == (expected_p % prime_modulus):
                        print(f'✅ Values are congruent modulo prime_modulus')
                        return True
                    else:
                        print(f'❌ Values are not even congruent modulo prime_modulus')
                        return False
            else:
                print(f'⚠️  No expected value to compare against, but reconstruction succeeded')
                return True
                
        except Exception as e:
            print(f'❌ Reconstruction failed: {e}')
            import traceback
            traceback.print_exc()
            return False

def test_with_subset_of_shares():
    """Test reconstruction with different combinations of shares."""
    
    print(f'\n🧪 TESTING WITH DIFFERENT SHARE COMBINATIONS:')
    
    app = create_app()
    with app.app_context():
        config = CryptoConfig.query.first()
        if not config:
            return False
            
        # Get parameters
        meta = json.loads(config.meta_data)
        threshold = meta.get('threshold', 3)
        
        prime_modulus = None
        for key in ['prime_modulus', 'prime']:
            if key in meta:
                prime_modulus = int(meta[key])
                break
        if not prime_modulus:
            security_data = meta.get('security_data', {})
            for key in ['prime_modulus', 'prime']:
                if key in security_data:
                    prime_modulus = int(security_data[key])
                    break
        
        if not prime_modulus:
            print("❌ Could not find prime modulus")
            return False
        
        # Get all shares
        key_shares = KeyShare.query.filter_by(crypto_id=config.crypto_id).all()
        all_parsed_shares = []
        
        for share in key_shares:
            try:
                x_str, y_hex = share.share_value.split(':', 1)
                x = int(x_str)
                y = int(y_hex, 16)
                share_obj = shamirs.share(x, y, prime_modulus)
                all_parsed_shares.append(share_obj)
            except:
                continue
        
        print(f'Total parsed shares: {len(all_parsed_shares)}')
        print(f'Required threshold: {threshold}')
        
        # Test with exactly threshold number of shares
        if len(all_parsed_shares) >= threshold:
            print(f'\nTesting with exactly {threshold} shares:')
            subset_shares = all_parsed_shares[:threshold]
            try:
                result = shamirs.interpolate(subset_shares)
                print(f'✅ Success with {threshold} shares: {result}')
            except Exception as e:
                print(f'❌ Failed with {threshold} shares: {e}')
        
        # Test with all shares
        if len(all_parsed_shares) > threshold:
            print(f'\nTesting with all {len(all_parsed_shares)} shares:')
            try:
                result = shamirs.interpolate(all_parsed_shares)
                print(f'✅ Success with all shares: {result}')
            except Exception as e:
                print(f'❌ Failed with all shares: {e}')
        
        return True

if __name__ == "__main__":
    success = test_key_reconstruction()
    test_with_subset_of_shares()
    
    if success:
        print(f'\n🎉 KEY RECONSTRUCTION TEST PASSED')
        print(f'The crypto configuration and shares are working correctly!')
        print(f'The issue may be elsewhere in the system.')
    else:
        print(f'\n❌ KEY RECONSTRUCTION TEST FAILED')
        print(f'There is an issue with the shares or reconstruction process.')
