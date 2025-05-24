#!/usr/bin/env python3
"""
Check existing crypto configurations in the database to identify 
which ones use the old φ(n) format vs the new prime p format.
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

def check_crypto_configurations():
    """Check all crypto configurations in the database."""
    
    print("🔍 CHECKING EXISTING CRYPTO CONFIGURATIONS")
    print("=" * 60)
    
    app = create_app()
    with app.app_context():
        configs = CryptoConfig.query.all()
        print(f'Found {len(configs)} crypto configurations in the database:\n')
        
        old_format_count = 0
        new_format_count = 0
        
        for config in configs:
            print(f'Crypto Config ID: {config.crypto_id}')
            print(f'  Election ID: {config.election_id}')
            print(f'  Key Type: {config.key_type}')
            print(f'  Status: {config.status}')
            
            if config.meta_data:
                try:
                    meta = json.loads(config.meta_data)
                    print(f'  Metadata keys: {list(meta.keys())}')
                    
                    security_data = meta.get('security_data', {})
                    if security_data:
                        print(f'  Security data keys: {list(security_data.keys())}')
                        
                        if 'p' in security_data:
                            print(f'  ✅ Configuration type: NEW (has prime p)')
                            new_format_count += 1
                        else:
                            print(f'  ❌ Configuration type: OLD (likely has φ(n))')
                            old_format_count += 1
                            
                            # Check for phi_n or other old format indicators
                            for key in security_data.keys():
                                if 'phi' in key.lower():
                                    print(f'    Found φ(n) key: {key}')
                    else:
                        print(f'  ⚠️  No security_data found')
                        old_format_count += 1
                        
                except Exception as e:
                    print(f'  ❌ Could not parse metadata: {e}')
                    old_format_count += 1
            else:
                print(f'  ⚠️  No metadata')
                old_format_count += 1
                
            print()
        
        print("📊 SUMMARY:")
        print(f"  New format configs (with prime p): {new_format_count}")
        print(f"  Old format configs (likely φ(n)): {old_format_count}")
        print(f"  Total configs: {len(configs)}")
        
        if old_format_count > 0:
            print("\n🔧 RECOMMENDATION:")
            print("  There are old format configurations in the database.")
            print("  These may be causing key reconstruction failures.")
            print("  Consider migrating or removing them.")
        else:
            print("\n✅ All configurations use the new format.")

if __name__ == "__main__":
    check_crypto_configurations()
