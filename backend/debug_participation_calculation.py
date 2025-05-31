#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.election import Election
from app.models.election_result import ElectionResult

def debug_participation_calculation():
    """Debug the participation calculation to see what's happening"""
    app = create_app()
    
    with app.app_context():
        print("=== DEBUGGING PARTICIPATION CALCULATION ===")
        
        # Get all elections
        all_elections = Election.query.all()
        print(f"\nAll elections in database:")
        for election in all_elections:
            print(f"  Election {election.election_id}: {election.election_name}")
            print(f"    Participation rate: {election.participation_rate}")
            print(f"    Status: {election.election_status}")
            print()
        
        # Get elections with results (completed elections)
        completed_election_ids = db.session.query(ElectionResult.election_id).distinct().subquery()
        elections_with_results = db.session.query(Election).filter(
            Election.election_id.in_(db.session.query(completed_election_ids.c.election_id))
        ).all()
        
        print(f"\nElections with results (completed):")
        for election in elections_with_results:
            print(f"  Election {election.election_id}: {election.election_name}")
            print(f"    Participation rate: {election.participation_rate}")
            print(f"    Type: {type(election.participation_rate)}")
            print(f"    Is not None: {election.participation_rate is not None}")
            print(f"    Is > 0: {election.participation_rate > 0 if election.participation_rate is not None else 'N/A'}")
            print()
        
        # Calculate average participation using the current logic
        print("\n=== CURRENT CALCULATION LOGIC ===")
        total_participation = 0
        elections_with_participation = 0
        
        for election in elections_with_results:
            print(f"Processing election {election.election_id}:")
            print(f"  Participation rate: {election.participation_rate}")
            
            # Use the stored participation_rate field if available
            if election.participation_rate is not None and election.participation_rate > 0:
                print(f"  ✓ Including in calculation")
                total_participation += election.participation_rate
                elections_with_participation += 1
                print(f"  Running total: {total_participation}")
                print(f"  Elections counted: {elections_with_participation}")
            else:
                print(f"  ✗ Excluding from calculation")
                print(f"    Is None: {election.participation_rate is None}")
                print(f"    Is <= 0: {election.participation_rate <= 0 if election.participation_rate is not None else 'N/A'}")
            print()
        
        avg_participation = round(total_participation / elections_with_participation, 1) if elections_with_participation > 0 else 0
        
        print(f"FINAL CALCULATION:")
        print(f"  Total participation: {total_participation}")
        print(f"  Elections with participation: {elections_with_participation}")
        print(f"  Average participation: {avg_participation}%")
        
        # Manual verification
        print(f"\n=== MANUAL VERIFICATION ===")
        participation_rates = [e.participation_rate for e in elections_with_results if e.participation_rate is not None]
        print(f"All participation rates: {participation_rates}")
        if participation_rates:
            manual_avg = sum(participation_rates) / len(participation_rates)
            print(f"Manual average: {manual_avg}")
            print(f"Manual average rounded: {round(manual_avg, 1)}")

if __name__ == "__main__":
    debug_participation_calculation()
