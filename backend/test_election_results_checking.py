#!/usr/bin/env python3
"""
Test script to verify the election results checking functionality
in the election controller methods.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.election import Election
from app.models.election_result import ElectionResult
from app.controllers.election_controller import ElectionController
from datetime import datetime, date
import json

def test_election_results_checking():
    """Test the election results checking functionality"""
    
    app = create_app()
    
    with app.app_context():
        print("=== Testing Election Results Checking Functionality ===\n")
        
        # Test 1: Check if helper method works
        print("Test 1: Testing _check_and_update_election_with_results helper method")
        
        # Find an election that might have results
        elections_with_results = db.session.query(Election).join(
            ElectionResult, Election.election_id == ElectionResult.election_id
        ).limit(5).all()
        
        if elections_with_results:
            print(f"Found {len(elections_with_results)} elections with results:")
            for election in elections_with_results:
                print(f"  Election ID: {election.election_id}, Name: {election.election_name}, Status: {election.election_status}")
                
                # Test the helper method
                original_status = election.election_status
                updated = ElectionController._check_and_update_election_with_results(election)
                
                print(f"    Original status: {original_status}")
                print(f"    Updated: {updated}")
                print(f"    New status: {election.election_status}")
                
                if updated and election.election_status == 'Finished':
                    print("    ✓ Helper method correctly updated status to 'Finished'")
                elif not updated and election.election_status == 'Finished':
                    print("    ✓ Election already had 'Finished' status")
                else:
                    print("    ⚠ Unexpected result")
                print()
        else:
            print("  No elections with results found for testing")
        
        # Test 2: Check elections without results
        print("\nTest 2: Testing elections without results")
        elections_without_results = db.session.query(Election).outerjoin(
            ElectionResult, Election.election_id == ElectionResult.election_id
        ).filter(ElectionResult.election_id == None).limit(3).all()
        
        if elections_without_results:
            print(f"Found {len(elections_without_results)} elections without results:")
            for election in elections_without_results:
                print(f"  Election ID: {election.election_id}, Name: {election.election_name}, Status: {election.election_status}")
                
                original_status = election.election_status
                updated = ElectionController._check_and_update_election_with_results(election)
                
                print(f"    Original status: {original_status}")
                print(f"    Updated: {updated}")
                print(f"    Status unchanged: {election.election_status}")
                
                if not updated:
                    print("    ✓ Helper method correctly left status unchanged")
                else:
                    print("    ⚠ Unexpected update for election without results")
                print()
        else:
            print("  No elections without results found for testing")
        
        # Test 3: Summary of all elections and their status vs results
        print("\nTest 3: Summary of all elections and their status vs results")
        all_elections = Election.query.all()
        
        status_summary = {
            'finished_with_results': 0,
            'finished_without_results': 0,
            'non_finished_with_results': 0,
            'non_finished_without_results': 0
        }
        
        for election in all_elections:
            has_results = ElectionResult.query.filter_by(election_id=election.election_id).first() is not None
            is_finished = election.election_status == 'Finished'
            
            if is_finished and has_results:
                status_summary['finished_with_results'] += 1
            elif is_finished and not has_results:
                status_summary['finished_without_results'] += 1
            elif not is_finished and has_results:
                status_summary['non_finished_with_results'] += 1
            else:
                status_summary['non_finished_without_results'] += 1
        
        print(f"  Elections with 'Finished' status and results: {status_summary['finished_with_results']}")
        print(f"  Elections with 'Finished' status but no results: {status_summary['finished_without_results']}")
        print(f"  Elections with results but not 'Finished' status: {status_summary['non_finished_with_results']}")
        print(f"  Elections without results and not 'Finished' status: {status_summary['non_finished_without_results']}")
        
        # Alert about inconsistencies
        if status_summary['non_finished_with_results'] > 0:
            print(f"\n  ⚠ ALERT: {status_summary['non_finished_with_results']} elections have results but are not marked as 'Finished'!")
            print("    These should be automatically corrected by the implemented solution.")
        else:
            print("\n  ✓ All elections with results are properly marked as 'Finished'")
        
        print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_election_results_checking()
