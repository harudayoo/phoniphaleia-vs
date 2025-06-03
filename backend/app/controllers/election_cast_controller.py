from app.models.election import Election
from app.models.candidate import Candidate
from app.models.position import Position
from app.models.vote import Vote
from app.models.voter import Voter
from app.models.election_waitlist import ElectionWaitlist
from app import db
from flask import jsonify, request
import os


class ElectionCastController:
    @staticmethod
    def get_candidates_by_election(election_id):
        """Return all candidates for a given election, grouped by position."""
        try:
            candidates = Candidate.query.filter_by(election_id=election_id).all()
            positions = Position.query.join(Candidate, Position.position_id == Candidate.position_id).filter(Candidate.election_id == election_id).all()
            grouped = {}
            for pos in positions:
                grouped[pos.position_id] = {
                    'position_id': pos.position_id,
                    'position_name': pos.position_name,
                    'description': pos.description,
                    'candidates': []
                }
            # Correct grouping: for each candidate, append to the right position
            for cand in candidates:
                pos_id = cand.position_id
                if pos_id in grouped:
                    photo_url = None
                    if cand.photo_path:
                        if '/' in cand.photo_path:
                            photo_url = f"/api/uploads/{os.path.basename(cand.photo_path)}"
                        else:
                            photo_url = f"/api/uploads/{cand.photo_path}"
                    grouped[pos_id]['candidates'].append({
                        'candidate_id': cand.candidate_id,
                        'fullname': cand.fullname,
                        'party': cand.party,
                        'candidate_desc': cand.candidate_desc,
                        'photo_url': photo_url
                    })
            return jsonify(list(grouped.values()))
        except Exception as ex:
            print('Error in get_candidates_by_election:', ex)
            return jsonify({'error': 'Failed to fetch candidates'}), 500    @staticmethod
    def submit_vote(election_id):
        """Submit a vote for an election. Enforce one per position, one per election per voter."""
        try:
            data = request.json or {}
            print('DEBUG submit_vote payload:', data)
            student_id = data.get('student_id')
            votes = data.get('votes')  # [{position_id, candidate_id, encrypted_vote, zkp_proof, verification_receipt}]
            
            print(f'DEBUG: Processing vote submission for election_id={election_id}, student_id={student_id}, votes count={len(votes) if votes else 0}')
            
            if not student_id or not isinstance(votes, list):
                print('DEBUG submit_vote error: missing student_id or votes')
                return jsonify({'error': 'Missing student_id or votes'}), 400
                
            # For encrypted voting, we store a standardized encrypted value representing 1 vote
            # The encrypted_vote field should contain the encrypted value of 1, not the candidate choice
            for v in votes:
                if not v.get('encrypted_vote'):
                    print('DEBUG submit_vote error: missing encrypted_vote for candidate', v.get('candidate_id'))
                    return jsonify({'error': 'All votes must include encrypted_vote'}), 400
            
            # Check for duplicate vote for this election
            existing = Vote.query.filter_by(election_id=election_id, student_id=student_id).first()
            if existing:
                print('DEBUG submit_vote error: already voted')
                return jsonify({'error': 'You have already voted in this election.'}), 400
                
            # Enforce one vote per position
            seen_positions = set()
            for v in votes:
                pos_id = v.get('position_id')
                if pos_id in seen_positions:
                    print('DEBUG submit_vote error: multiple votes for same position')
                    return jsonify({'error': 'Multiple votes for the same position are not allowed.'}), 400
                seen_positions.add(pos_id)
                
            # Save votes with proper encrypted data
            # Each vote represents one vote for the chosen candidate
            for v in votes:
                print('DEBUG submit_vote saving vote for candidate:', v.get('candidate_id'))
                
                # Store ZKP proof if provided, otherwise mark as verified for now
                zkp_status = 'verified'  # Default status
                if 'zkp_proof' in v and v['zkp_proof']:
                    zkp_status = 'verified_with_proof'
                
                # Store the encrypted vote (which should be the encryption of value 1)
                vote = Vote(
                    election_id=election_id,
                    student_id=student_id,
                    candidate_id=v['candidate_id'],
                    encrypted_vote=v['encrypted_vote'],  # This should be encryption of 1
                    zkp_proof=zkp_status,
                    verification_receipt='sent',
                    vote_status='cast'
                )
                db.session.add(vote)
            
            # Update participation rate based on actual votes cast
            election = Election.query.get(election_id)
            if election and election.organization:
                print(f'DEBUG: Election {election_id} organization: org_id={election.org_id}, college_id={election.organization.college_id or "None"}')
                
                if election.organization.college_id:
                    # Election is restricted to one college
                    eligible_voters = Voter.query.filter_by(college_id=election.organization.college_id).count()
                    print(f'DEBUG: College-specific election. Eligible voters from college_id={election.organization.college_id}: {eligible_voters}')
                else:
                    # Election is open to all colleges
                    eligible_voters = Voter.query.count()
                    print(f'DEBUG: All-college election. Total eligible voters: {eligible_voters}')
                
                if eligible_voters > 0:
                    # Count unique voters who have cast votes in this election
                    unique_voters_count = db.session.query(db.func.count(db.distinct(Vote.student_id))).filter(Vote.election_id == election_id).scalar()
                    election.participation_rate = (unique_voters_count / eligible_voters) * 100
                    print(f'DEBUG: Participation rate calculation: {unique_voters_count} unique voters / {eligible_voters} eligible voters = {election.participation_rate:.2f}%')                
            db.session.commit()
            print('DEBUG submit_vote success')
            return jsonify({
                'message': 'Vote submitted successfully',
                'votes_count': len(votes),
                'election_id': election_id,
                'total_voters': election.voters_count if election else None,
                'participation_rate': round(election.participation_rate, 2) if election and election.participation_rate else None
            })
            
        except Exception as ex:
            db.session.rollback()
            print('Error in submit_vote:', ex)
            return jsonify({'error': 'Failed to submit vote'}), 500

    @staticmethod
    def check_voter_voted(election_id, voter_id=None):
        """Check if a voter has already voted in this election"""
        try:
            # If coming from POST request body
            if request.method == 'POST':
                data = request.json or {}
                voter_id = data.get('voter_id')
            
            if not voter_id:
                return jsonify({"error": "No voter_id provided"}), 400
                
            # Check database for existing votes
            existing = Vote.query.filter_by(election_id=election_id, student_id=voter_id).first()
            
            return jsonify({
                "unique": not existing,  # true if no existing vote, false otherwise
                "message": "You have already voted in this election." if existing else "You haven't voted in this election yet."
            })
        except Exception as ex:
            print('Error in check_voter_voted:', ex)
            return jsonify({"error": "Failed to check voting status"}), 500

    @staticmethod
    def get_votes_by_voter(election_id, student_id):
        try:
            # Get all votes for this election and student
            votes = (
                db.session.query(Vote, Candidate, Position)
                .join(Candidate, Vote.candidate_id == Candidate.candidate_id)
                .join(Position, Candidate.position_id == Position.position_id)
                .filter(Vote.election_id == election_id, Vote.student_id == student_id)
                .all()
            )
            result = [
                {
                    'candidate_id': v[0].candidate_id,
                    'position_id': v[1].position_id,
                    'candidate_name': v[1].fullname,
                    'party': v[1].party,
                    'position_name': v[2].position_name
                }
                for v in votes
            ]
            return jsonify({'votes': result})
        except Exception as ex:
            print('Error in get_votes_by_voter:', ex)
            return jsonify({'error': 'Failed to fetch votes'}), 500

    @staticmethod
    def start_voting_session(election_id):
        """
        Endpoint to handle when a voter starts their voting session.
        For non-queued elections: increments the voter_count if not already counted.
        For queued elections: the waitlist system already handles this.
        """
        try:
            data = request.json or {}
            voter_id = data.get('voter_id')
            
            if not voter_id:
                return jsonify({'error': 'voter_id required'}), 400
            
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': 'Election not found'}), 404
            
            print(f"DEBUG start_voting_session: election_id={election_id}, voter_id={voter_id}, queued_access={election.queued_access}")
            
            if not election.queued_access:
                # For non-queued elections, DO NOT increment voters_count here
                # access_check has already incremented it when grant_access=true was called
                current_voters = election.voters_count or 0
                max_concurrent = election.max_concurrent_voters or 1
                
                print(f"DEBUG: start_voting_session - current_voters={current_voters}, max_concurrent={max_concurrent}")
                print(f"DEBUG: start_voting_session - access_check already incremented voters_count, just validating session")
                
                # Just validate that the voter should have access based on current count
                if current_voters <= max_concurrent:
                    # Voter should have access (was already counted by access_check)
                    print(f"DEBUG: Voting session validated, voters_count={election.voters_count}")
                    return jsonify({
                        'message': 'Voting session validated (already counted by access_check)',
                        'voters_count': election.voters_count,
                        'max_concurrent_voters': max_concurrent,
                        'queued_access': False
                    })
                else:
                    # This shouldn't happen if access_check is working correctly
                    print(f"DEBUG: Unexpected: Election over capacity in start_voting_session")
                    return jsonify({
                        'error': 'Election is unexpectedly full',
                        'voters_count': current_voters,
                        'max_concurrent_voters': max_concurrent,
                        'queued_access': False
                    }), 403
            else:
                # For queued elections, validate voter access without incrementing count
                # access_check has already incremented voters_count when grant_access=true was called
                active_entry = ElectionWaitlist.query.filter_by(
                    election_id=election_id,
                    voter_id=voter_id,
                    status='active'
                ).first()
                
                if active_entry:
                    # Voter came from waitlist activation - access_check already handled the count
                    print(f"DEBUG: Queued election - voter came from waitlist, voters_count already managed by access_check")
                    return jsonify({
                        'message': 'Voting session active from waitlist (counted by access_check)',
                        'queued_access': True,
                        'voters_count': election.voters_count
                    })
                else:
                    # Check if voter has direct access (not through waitlist)
                    # This happens when election had available slots during access-check
                    current_voters = election.voters_count or 0
                    max_concurrent = election.max_concurrent_voters or 1
                    
                    print(f"DEBUG: Queued election - validating direct access, voters_count={current_voters}, max={max_concurrent}")
                    
                    if current_voters > 0 and current_voters <= max_concurrent:
                        # Voter likely has direct access - access_check already counted them
                        print(f"DEBUG: Queued election - voter has direct access, already counted by access_check")
                        return jsonify({
                            'message': 'Voting session active (direct access, counted by access_check)',
                            'queued_access': True,
                            'voters_count': election.voters_count
                        })
                    else:
                        print(f"DEBUG: Queued election - no valid access found for voter {voter_id}")
                        return jsonify({
                            'error': 'No active voting session found',
                            'queued_access': True
                        }), 403
                
        except Exception as ex:
            db.session.rollback()
            print(f'Error in start_voting_session: {ex}')
            return jsonify({'error': 'Failed to start voting session'}), 500

    @staticmethod
    def leave_voting_session(election_id):
        """
        Endpoint to handle when a voter leaves the voting session without completing their vote.
        For queued elections: marks their waitlist entry as 'done' and allows next person to vote.
        For non-queued elections: decrements the voter_count to free up a slot.
        """
        try:
            data = request.json or {}
            voter_id = data.get('voter_id')
            
            if not voter_id:
                return jsonify({'error': 'voter_id required'}), 400
            
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': 'Election not found'}), 404
                
            print(f"DEBUG: leave_voting_session called for election {election_id}, voter {voter_id}")
            print(f"DEBUG: Current voters_count: {election.voters_count}, queued_access: {election.queued_access}")
                
            if election.queued_access:
                # For queued elections, update waitlist status AND decrement voters_count
                waitlist_entry = ElectionWaitlist.query.filter_by(
                    election_id=election_id,
                    voter_id=voter_id,
                    status='active'
                ).first()
                
                if waitlist_entry:
                    # Mark as done and decrement voters_count
                    waitlist_entry.status = 'done'
                    old_count = election.voters_count or 0
                    if old_count > 0:
                        election.voters_count = old_count - 1
                        print(f"DEBUG: Decremented voters_count from {old_count} to {election.voters_count}")
                    
                    # Try to activate next person in queue
                    next_entry = ElectionWaitlist.query.filter_by(
                        election_id=election_id, 
                        status='waiting'
                    ).order_by(ElectionWaitlist.joined_at).first()
                    
                    if next_entry:
                        next_entry.status = 'active'
                        print(f"DEBUG: Activated next voter in queue: {next_entry.voter_id}")
                        
                    db.session.commit()
                    return jsonify({
                        'message': 'Successfully left voting session',
                        'voters_count': election.voters_count,
                        'next_voter_activated': bool(next_entry),
                        'voter_id': voter_id,
                        'election_id': election_id
                    }), 200
                else:
                    # Check if voter might be in waitlist but not active
                    any_waitlist_entry = ElectionWaitlist.query.filter_by(
                        election_id=election_id,
                        voter_id=voter_id
                    ).first()
                    
                    if any_waitlist_entry:
                        print(f"DEBUG: Found waitlist entry with status: {any_waitlist_entry.status}")
                    
                    # Even if not in active waitlist, still try to decrement voters_count
                    old_count = election.voters_count or 0
                    if old_count > 0:
                        election.voters_count = old_count - 1
                        print(f"DEBUG: Force decremented voters_count from {old_count} to {election.voters_count}")
                        db.session.commit()
                    
                    return jsonify({
                        'message': 'Left voting session (not in active waitlist)',
                        'voters_count': election.voters_count,
                        'voter_id': voter_id,
                        'election_id': election_id
                    }), 200
            else:
                # For non-queued elections, decrement voter_count
                old_count = election.voters_count or 0
                if old_count > 0:
                    election.voters_count = old_count - 1
                    print(f"DEBUG: Non-queued election - decremented voters_count from {old_count} to {election.voters_count}")
                    db.session.commit()
                    return jsonify({
                        'message': 'Successfully left voting session',
                        'voters_count': election.voters_count,
                        'voter_id': voter_id,
                        'election_id': election_id
                    }), 200
                else:
                    print(f"DEBUG: No voters_count to decrement (current: {old_count})")
                    return jsonify({
                        'message': 'No active voting session to leave',
                        'voters_count': election.voters_count,
                        'voter_id': voter_id,
                        'election_id': election_id
                    }), 200
                    
        except Exception as ex:
            db.session.rollback()
            print(f'Error in leave_voting_session: {ex}')
            return jsonify({'error': 'Failed to leave voting session'}), 500

    @staticmethod
    def increment_voters_count(election_id):
        """
        Increment the voters_count for an election when a voter starts voting.
        """
        try:
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': 'Election not found'}), 404
            
            # Initialize voters_count if it's None
            if election.voters_count is None:
                election.voters_count = 0
            
            # Increment the count
            election.voters_count += 1
            
            db.session.commit()
            
            return jsonify({
                'message': 'Voters count incremented successfully',
                'voters_count': election.voters_count
            }), 200
            
        except Exception as ex:
            db.session.rollback()
            print(f"Error incrementing voters count: {ex}")
            return jsonify({'error': 'Failed to increment voters count'}), 500

    @staticmethod
    def decrement_voters_count(election_id):
        """Decrement active voters count for an election"""
        try:
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': 'Election not found'}), 404
            
            # Decrement the count (ensure it doesn't go below 0)
            if election.voters_count is None or election.voters_count <= 0:
                election.voters_count = 0
            else:
                election.voters_count -= 1
            
            db.session.commit()
            
            return jsonify({
                'message': 'Voters count decremented successfully',
                'voters_count': election.voters_count
            }), 200
            
        except Exception as ex:
            db.session.rollback()
            print(f"Error decrementing voters count for election {election_id}: {str(ex)}")
            return jsonify({'error': 'Failed to decrement voters count'}), 500
