#!/usr/bin/env python3
"""
Debug script to check dashboard data through models
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.election import Election
from app.models.election_result import ElectionResult
from app.models.vote import Vote
from app.models.voter import Voter
from app.models.organization import Organization
from app.models.college import College
from datetime import datetime
from sqlalchemy import func, distinct

def debug_dashboard_data():
    """Debug function to check what data exists for the dashboard"""
    app = create_app()
    
    with app.app_context():
        print("=== Dashboard Data Debug ===\n")
        
        # Check current date for reference
        now = datetime.now()
        print(f"Current date: {now}")
        print(f"Current date (date only): {now.date()}\n")
        
        # 1. Check all elections
        print("1. ALL ELECTIONS:")
        elections = Election.query.all()
        print(f"Total elections in database: {len(elections)}")
        
        for election in elections:
            print(f"  Election ID: {election.election_id}")
            print(f"  Name: {election.election_name}")
            print(f"  Status: {election.election_status}")
            print(f"  Start Date: {election.date_start}")
            print(f"  End Date: {election.date_end}")
            print(f"  Organization ID: {election.org_id}")
            
            # Check if this election has ended
            has_ended = election.date_end < now.date()
            print(f"  Has ended: {has_ended}")
            print()
        
        # 2. Check election results
        print("2. ELECTION RESULTS:")
        results = ElectionResult.query.all()
        print(f"Total election results: {len(results)}")
        
        # Group by election
        elections_with_results = {}
        for result in results:
            if result.election_id not in elections_with_results:
                elections_with_results[result.election_id] = []
            elections_with_results[result.election_id].append(result)
        
        print(f"Elections with results: {list(elections_with_results.keys())}")
        
        for election_id, election_results in elections_with_results.items():
            print(f"  Election {election_id}:")
            for result in election_results:
                print(f"    Candidate {result.candidate_id}: {result.vote_count} votes")
        print()
        
        # 3. Check votes
        print("3. VOTES:")
        votes = Vote.query.all()
        print(f"Total votes in database: {len(votes)}")
        
        # Group by election
        votes_by_election = {}
        for vote in votes:
            if vote.election_id not in votes_by_election:
                votes_by_election[vote.election_id] = 0
            votes_by_election[vote.election_id] += 1
        
        for election_id, vote_count in votes_by_election.items():
            print(f"  Election {election_id}: {vote_count} votes")
        print()
        
        # 4. Check voters
        print("4. VOTERS:")
        voters = Voter.query.all()
        print(f"Total voters in database: {len(voters)}")
        
        # Group by college
        voters_by_college = {}
        for voter in voters:
            if voter.college_id not in voters_by_college:
                voters_by_college[voter.college_id] = 0
            voters_by_college[voter.college_id] += 1
        
        for college_id, voter_count in voters_by_college.items():
            print(f"  College {college_id}: {voter_count} voters")
        print()
        
        # 5. Check organizations and colleges
        print("5. ORGANIZATIONS:")
        organizations = Organization.query.all()
        for org in organizations:
            print(f"  Org ID: {org.org_id}, Name: {org.org_name}, College ID: {org.college_id}")
        print()
        
        print("6. COLLEGES:")
        colleges = College.query.all()
        for college in colleges:
            print(f"  College ID: {college.college_id}, Name: {college.college_name}")
        print()
        
        # 7. Calculate completed elections based on results
        print("7. COMPLETED ELECTIONS CALCULATION:")
        completed_elections_query = db.session.query(distinct(ElectionResult.election_id)).all()
        completed_election_ids = [row[0] for row in completed_elections_query]
        print(f"Elections with results (completed): {completed_election_ids}")
        print(f"Number of completed elections: {len(completed_election_ids)}")
        print()
        
        # 8. Calculate participation for each completed election
        print("8. PARTICIPATION CALCULATION:")
        total_participation = 0
        valid_elections = 0
        
        for election_id in completed_election_ids:
            # Get election details
            election = Election.query.get(election_id)
            if not election:
                print(f"  Election {election_id}: NOT FOUND")
                continue
                
            print(f"  Election {election_id} ({election.election_name}):")
            
            # Get organization and college
            org = Organization.query.get(election.org_id)
            if not org:
                print(f"    Organization {election.org_id}: NOT FOUND")
                continue
                
            print(f"    Organization: {org.org_name} (College {org.college_id})")
            
            # Count eligible voters (voters in the same college)
            eligible_voters = Voter.query.filter_by(college_id=org.college_id).count()
            print(f"    Eligible voters (college {org.college_id}): {eligible_voters}")
            
            # Count actual votes
            actual_votes = Vote.query.filter_by(election_id=election_id).count()
            print(f"    Actual votes: {actual_votes}")
            
            if eligible_voters > 0:
                participation = (actual_votes / eligible_voters) * 100
                print(f"    Participation rate: {participation:.1f}%")
                total_participation += participation
                valid_elections += 1
            else:
                print(f"    Participation rate: Cannot calculate (no eligible voters)")
            print()
        
        # Calculate average participation
        if valid_elections > 0:
            avg_participation = total_participation / valid_elections
            print(f"AVERAGE PARTICIPATION: {avg_participation:.1f}%")
        else:
            print(f"AVERAGE PARTICIPATION: 0% (no valid elections)")
        
        print(f"\n=== FINAL DASHBOARD STATS ===")
        print(f"Active elections: {Election.query.filter(Election.date_end >= now.date()).count()}")
        print(f"Completed elections: {len(completed_election_ids)}")
        print(f"Total voters: {Voter.query.count()}")
        print(f"Average participation: {avg_participation:.1f}% ({valid_elections} elections)" if valid_elections > 0 else "Average participation: 0%")

if __name__ == "__main__":
    debug_dashboard_data()
