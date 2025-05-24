#!/usr/bin/env python3
"""
Check crypto data stored in database using Flask app context and CryptoConfig model
"""
import os
import sys
import json

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def check_crypto_data():
    try:
        from app import create_app
        from app.models.crypto_config import CryptoConfig
        from app.models.key_share import KeyShare
        from app.models.trusted_authority import TrustedAuthority
        
        # Create Flask app context
        app = create_app()
        with app.app_context():
            print("🔍 Checking crypto data via Flask models...")
            
            # Get the latest crypto config
            latest_crypto = CryptoConfig.query.order_by(CryptoConfig.crypto_id.desc()).first()
            
            if not latest_crypto:
                print("❌ No crypto configs found")
                return
                
            print(f"📊 Latest crypto config ID: {latest_crypto.crypto_id}")
            print(f"📊 Election ID: {latest_crypto.election_id}")
            print(f"📊 Key type: {latest_crypto.key_type}")
            print(f"📊 Status: {latest_crypto.status}")
            print(f"📊 Public key length: {len(latest_crypto.public_key) if latest_crypto.public_key else 0}")
            print(f"📊 Created at: {latest_crypto.created_at}")
            
            # Parse and analyze meta_data
            if latest_crypto.meta_data:
                try:
                    meta_data = json.loads(latest_crypto.meta_data)
                    print(f"\n🔐 Meta data structure:")
                    print(f"   Keys: {list(meta_data.keys())}")
                    
                    # Check for security_data
                    if 'security_data' in meta_data:
                        security_data = meta_data['security_data']
                        print(f"   Security data type: {type(security_data)}")
                        if isinstance(security_data, dict):
                            print(f"   Security data keys: {list(security_data.keys())}")
                            
                            # Check for critical fields
                            critical_fields = ['p', 'prime_modulus', 'n', 'sharing_method']
                            for field in critical_fields:
                                if field in security_data:
                                    value = security_data[field]
                                    if isinstance(value, (int, str)):
                                        print(f"   ✅ {field}: {len(str(value))} chars")
                                    else:
                                        print(f"   ❌ {field}: {type(value)} - {value}")
                                else:
                                    print(f"   ❌ {field}: Missing")
                        else:
                            print(f"   ❌ Security data is not a dict: {security_data}")
                    else:
                        print("   ❌ No security_data in meta_data")
                        
                    # Check for top-level fields
                    top_level_fields = ['p', 'prime', 'prime_modulus', 'sharing_method', 'threshold']
                    print(f"\n🔍 Top-level fields:")
                    for field in top_level_fields:
                        if field in meta_data:
                            value = meta_data[field]
                            if isinstance(value, (int, str)):
                                print(f"   ✅ {field}: {len(str(value))} chars")
                            else:
                                print(f"   ❌ {field}: {type(value)} - {value}")
                        else:
                            print(f"   ❌ {field}: Missing")
                            
                except json.JSONDecodeError as e:
                    print(f"❌ Error parsing meta_data JSON: {e}")
                except Exception as e:
                    print(f"❌ Error analyzing meta_data: {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print("❌ No meta_data found")
                
            # Check associated key shares
            key_shares = KeyShare.query.filter_by(crypto_id=latest_crypto.crypto_id).all()
            print(f"\n🔑 Key shares for crypto_id {latest_crypto.crypto_id}:")
            print(f"   Count: {len(key_shares)}")
            
            for i, share in enumerate(key_shares, 1):
                authority = TrustedAuthority.query.get(share.authority_id)
                authority_name = authority.authority_name if authority else f"Unknown({share.authority_id})"
                share_length = len(share.share_value) if share.share_value else 0
                print(f"   Share {i}: {authority_name} - {share_length} chars")
                
            print(f"\n✅ Analysis complete for crypto_id {latest_crypto.crypto_id}")
            
    except Exception as e:
        print(f"❌ Error accessing database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_crypto_data()
