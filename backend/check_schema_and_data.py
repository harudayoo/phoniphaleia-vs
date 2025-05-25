#!/usr/bin/env python3
"""
Check database schema and existing data to debug the 404 error
"""
import sys
import os

# Add the backend path to sys.path
backend_path = r'C:\Users\cayan\Documents\Development-Projects\phoniphaleia\backend'
sys.path.insert(0, backend_path)

try:
    from app import create_app, db
    from app.models.election import Election
    from app.models.election_result import ElectionResult
    from app.models.candidate import Candidate
    from app.models.position import Position
    from app.models.organization import Organization
    from sqlalchemy import inspect
    
    app = create_app()
    
    with app.app_context():
        print("=== DATABASE SCHEMA ANALYSIS ===")
        
        # Check election_results table schema
        inspector = inspect(db.engine)
        print("\n1. ELECTION_RESULTS TABLE SCHEMA:")
        columns = inspector.get_columns('election_results')
        for col in columns:
            print(f"   {col['name']}: {col['type']} (nullable: {col['nullable']})")
        
        # Check elections table schema
        print("\n2. ELECTIONS TABLE SCHEMA:")
        columns = inspector.get_columns('elections')
        for col in columns:
            print(f"   {col['name']}: {col['type']} (nullable: {col['nullable']})")
        
        # Check candidates table schema
        print("\n3. CANDIDATES TABLE SCHEMA:")
        columns = inspector.get_columns('candidates')
        for col in columns:
            print(f"   {col['name']}: {col['type']} (nullable: {col['nullable']})")
            
        # Check actual data
        print("\n=== ACTUAL DATA ===")
        
        # Check if result_id 67 exists
        print("\n4. CHECKING RESULT_ID 67:")
        result_67 = ElectionResult.query.get(67)
        if result_67:
            print(f"   ✓ Result ID 67 exists: Election {result_67.election_id}, Candidate {result_67.candidate_id}")
        else:
            print("   ✗ Result ID 67 does not exist")
        
        # Show all available result IDs
        print("\n5. ALL AVAILABLE RESULT IDs:")
        all_results = ElectionResult.query.all()
        if all_results:
            result_ids = [r.result_id for r in all_results]
            print(f"   Available result IDs: {sorted(result_ids)}")
            print(f"   Total results: {len(all_results)}")
            
            # Show some sample results
            print("\n6. SAMPLE RESULTS (first 5):")
            for result in all_results[:5]:
                election = Election.query.get(result.election_id)
                candidate = Candidate.query.get(result.candidate_id)
                print(f"   Result {result.result_id}: Election '{election.election_name if election else 'Unknown'}', Candidate '{candidate.fullname if candidate else 'Unknown'}'")
        else:
            print("   No election results found in database")
        
        # Check elections
        print("\n7. ALL ELECTIONS:")
        elections = Election.query.all()
        for election in elections:
            org = Organization.query.get(election.org_id) if election.org_id else None
            print(f"   Election {election.election_id}: '{election.election_name}' (Org: {org.org_name if org else 'None'}, Status: {election.election_status})")
        
        # Check foreign key relationships
        print("\n8. RELATIONSHIP VERIFICATION:")
        for result in all_results[:3]:  # Check first 3 results
            election = Election.query.get(result.election_id)
            candidate = Candidate.query.get(result.candidate_id)
            print(f"   Result {result.result_id}:")
            print(f"     - Election {result.election_id}: {'✓ EXISTS' if election else '✗ MISSING'}")
            print(f"     - Candidate {result.candidate_id}: {'✓ EXISTS' if candidate else '✗ MISSING'}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
