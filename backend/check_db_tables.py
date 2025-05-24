#!/usr/bin/env python3
"""
Check what tables exist in the database
"""
import sqlite3

# Connect to database
conn = sqlite3.connect('app/voting_system.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("Tables in database:")
for table in tables:
    print(f"  - {table[0]}")
    
# Check if we have any crypto-related tables
crypto_tables = [t[0] for t in tables if 'crypto' in t[0].lower()]
if crypto_tables:
    print(f"\nCrypto-related tables: {crypto_tables}")
else:
    print("\nNo crypto-related tables found")

conn.close()
