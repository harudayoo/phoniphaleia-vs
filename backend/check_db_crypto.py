#!/usr/bin/env python3
"""
Check what crypto data is stored in the database
"""
import sqlite3
import json
import sys
sys.path.insert(0, 'app')

# Connect to database
conn = sqlite3.connect('app/voting_system.db')
cursor = conn.cursor()

# Get the latest crypto config
cursor.execute('SELECT crypto_id, election_id, meta_data, public_key FROM crypto_configs ORDER BY crypto_id DESC LIMIT 1')
result = cursor.fetchone()

if result:
    crypto_id, election_id, meta_data_str, public_key = result
    print(f'Latest crypto config ID: {crypto_id}, Election ID: {election_id}')
    print(f'Public key length: {len(public_key) if public_key else 0}')
    print(f'Meta data raw: {meta_data_str[:200]}...')
    
    if meta_data_str:
        try:
            meta_data = json.loads(meta_data_str)
            print(f'Meta data keys: {list(meta_data.keys())}')
            
            has_security = 'security_data' in meta_data
            print(f'Security data in meta: {has_security}')
            
            if has_security:
                security_data = meta_data['security_data']
                if isinstance(security_data, dict):
                    print(f'Security data keys: {list(security_data.keys())}')
                    print(f'Has p: {"p" in security_data}')
                    print(f'Has prime_modulus: {"prime_modulus" in security_data}')
                    if "p" in security_data:
                        print(f'P length: {len(str(security_data["p"]))}')
                    if "prime_modulus" in security_data:
                        print(f'Prime modulus length: {len(str(security_data["prime_modulus"]))}')
                else:
                    print(f'Security data type: {type(security_data)}')
                    print(f'Security data value: {security_data}')
            
            has_p = 'p' in meta_data
            has_prime = 'prime' in meta_data
            print(f'Top-level p: {has_p}')
            print(f'Top-level prime: {has_prime}')
            
            if has_p:
                print(f'Top-level p length: {len(str(meta_data["p"]))}')
            if has_prime:
                print(f'Top-level prime length: {len(str(meta_data["prime"]))}')
                
        except Exception as e:
            print(f'Error parsing meta_data: {e}')
            import traceback
            traceback.print_exc()
else:
    print('No crypto configs found')

conn.close()
