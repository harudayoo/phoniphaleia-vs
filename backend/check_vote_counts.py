#!/usr/bin/env python3

import os
import sys

# Set required environment variables with defaults
os.environ.setdefault('SESSION_TIMEOUT_MINUTES', '30')
os.environ.setdefault('MAIL_PORT', '587')
os.environ.setdefault('DATABASE_URL', 'sqlite:///app.db')

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app import create_app, db
from app.models.election_result import ElectionResult
from app.models.candidate import Candidate
from app.models.position import Position

def check_election_results(election_id=55):
    app = create_app()
    with app.app_context():
        print(f"=== Election Results for Election {election_id} ===")
        
        # Get results with candidate and position info
        results = db.session.query(
            ElectionResult,
            Candidate,
            Position
        ).join(
            Candidate, ElectionResult.candidate_id == Candidate.candidate_id
        ).join(
            Position, Candidate.position_id == Position.position_id
        ).filter(
            ElectionResult.election_id == election_id
        ).all()
        
        print(f"Found {len(results)} results")
        print()
        print("Candidate ID | Candidate Name       | Position            | Vote Count")
        print("-" * 70)
        
        for election_result, candidate, position in results:
            print(f"{candidate.candidate_id:11} | {candidate.fullname[:20]:20} | {position.position_name[:18]:18} | {election_result.vote_count}")
        
        print()
        print("=== Summary by Position ===")
        positions_dict = {}
        for election_result, candidate, position in results:
            if position.position_id not in positions_dict:
                positions_dict[position.position_id] = {
                    'position_name': position.position_name,
                    'candidates': []
                }
            positions_dict[position.position_id]['candidates'].append({
                'candidate_id': candidate.candidate_id,
                'fullname': candidate.fullname,
                'vote_count': election_result.vote_count or 0
            })
        
        for pos_id, pos_data in positions_dict.items():
            print(f"\nPosition: {pos_data['position_name']}")
            total_votes = sum(c['vote_count'] for c in pos_data['candidates'])
            print(f"Total votes: {total_votes}")
            
            for candidate in pos_data['candidates']:
                winner_mark = " (WINNER)" if candidate['vote_count'] == max(c['vote_count'] for c in pos_data['candidates']) else ""
                print(f"  - {candidate['fullname']}: {candidate['vote_count']} votes{winner_mark}")

if __name__ == "__main__":
    check_election_results()
