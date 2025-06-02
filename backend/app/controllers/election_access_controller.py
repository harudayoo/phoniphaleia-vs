from app.models.election import Election
from app.models.voter import Voter
from app.models.vote import Vote
from app.models.election_waitlist import ElectionWaitlist
from app import db
from flask import jsonify, request
from datetime import datetime


class ElectionAccessController:
    @staticmethod
    def access_check(election_id):
        try:
            data = request.json or {}
            voter_id = data.get('voter_id')
            grant_access = data.get('grant_access', False)  # Flag to indicate if access should be granted
            
            print(f"DEBUG access_check: election_id={election_id}, voter_id={voter_id}, grant_access={grant_access}")
            
            if not voter_id:
                return jsonify({'eligible': False, 'reason': 'No voter_id provided'}), 400
            
            # Get election and voter
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'eligible': False, 'reason': 'Election not found'}), 404
                
            voter = Voter.query.get(voter_id)
            if not voter:
                return jsonify({'eligible': False, 'reason': 'Voter not found'}), 404
            
            # STEP 1: Check voter validity and eligibility
            # Check if user already voted in this election
            existing_vote = Vote.query.filter_by(election_id=election_id, student_id=voter_id).first()
            if existing_vote:
                return jsonify({'eligible': False, 'reason': 'You have already voted in this election'}), 403
            
            # Check voter status - only 'Enrolled' voters are eligible to vote
            if voter.status != 'Enrolled':
                return jsonify({'eligible': False, 'reason': f'Voter status is "{voter.status}". Only enrolled students can vote.'}), 403
                
            # If organization has college affiliation, check if voter is from the same college
            if election.organization and election.organization.college_id and voter.college_id != election.organization.college_id:
                return jsonify({'eligible': False, 'reason': 'Voter not in the same college as election'}), 403
            
            # At this point, voter is valid and eligible
            
            # If not granting access, just return eligibility status
            if not grant_access:
                return jsonify({'eligible': True})
            
            # STEP 2: Check queued access and handle accordingly
            if not election.queued_access:
                # No queued access - check voters_count vs max_concurrent_voters
                current_voters = election.voters_count or 0
                max_concurrent = election.max_concurrent_voters or 1
                if current_voters < max_concurrent:
                    # Election is not full - grant access and increment voters_count
                    old_count = election.voters_count or 0
                    election.voters_count = current_voters + 1
                    db.session.commit()
                    print(f"DEBUG: Non-queued election - incremented voters_count from {old_count} to {election.voters_count}")
                    return jsonify({
                        'eligible': True, 
                        'access_granted': True,
                        'voters_count': election.voters_count,
                        'max_concurrent_voters': max_concurrent,
                        'action': 'redirect_to_cast'
                    })
                else:
                    # Election is full - redirect to waitlist notification
                    return jsonify({
                        'eligible': True,
                        'access_granted': False,
                        'election_full': True,
                        'voters_count': current_voters,
                        'max_concurrent_voters': max_concurrent,
                        'action': 'redirect_to_waitlist'
                    })
            else:
                # Check if voter is coming from waitlist activation
                active_waitlist_entry = ElectionWaitlist.query.filter_by(
                    election_id=election_id, 
                    voter_id=voter_id, 
                    status='active'
                ).first()
                
                if active_waitlist_entry:
                    # Voter was activated from waitlist - grant access, increment voters_count, and mark waitlist as done
                    old_count = election.voters_count or 0
                    election.voters_count = old_count + 1
                    active_waitlist_entry.status = 'done'
                    db.session.commit()
                    print(f"DEBUG: Queued election (from waitlist) - incremented voters_count from {old_count} to {election.voters_count}")
                    
                    return jsonify({
                        'eligible': True, 
                        'access_granted': True,
                        'voters_count': election.voters_count,
                        'max_concurrent_voters': election.max_concurrent_voters or 1,
                        'action': 'redirect_to_cast',
                        'from_waitlist': True
                    })
                
                # Use voters_count to check if election is full
                current_voters = election.voters_count or 0
                max_concurrent = election.max_concurrent_voters or 1
                
                print(f"DEBUG: Queued election - current_voters={current_voters}, max_concurrent={max_concurrent}")
                
                if current_voters < max_concurrent:
                    # Election has available slots - grant access and increment voters_count
                    # Check if voter is already waiting in queue and remove them
                    existing_waitlist = ElectionWaitlist.query.filter_by(
                        election_id=election_id, 
                        voter_id=voter_id,
                        status='waiting'
                    ).first()
                    if existing_waitlist:
                        existing_waitlist.status = 'done'
                    
                    # Increment voters_count and grant access
                    old_count = election.voters_count or 0
                    election.voters_count = current_voters + 1
                    db.session.commit()
                    print(f"DEBUG: Queued election (direct access) - incremented voters_count from {old_count} to {election.voters_count}")
                    
                    return jsonify({
                        'eligible': True, 
                        'access_granted': True,
                        'voters_count': election.voters_count,
                        'max_concurrent_voters': max_concurrent,
                        'action': 'redirect_to_cast'
                    })
                else:
                    # Election is full - add to waitlist queue
                    # Check if voter is already in waitlist
                    existing_waitlist = ElectionWaitlist.query.filter_by(
                        election_id=election_id, 
                        voter_id=voter_id, 
                        status='waiting'
                    ).first()
                    
                    if not existing_waitlist:
                        # Add to waitlist queue
                        waitlist_entry = ElectionWaitlist(
                            election_id=election_id,
                            voter_id=voter_id,
                            status='waiting'
                        )
                        db.session.add(waitlist_entry)
                        db.session.commit()
                        return jsonify({
                            'eligible': True,
                            'access_granted': False,
                            'election_full': True,
                            'voters_count': current_voters,
                            'max_concurrent_voters': max_concurrent,
                            'action': 'redirect_to_waitlist'
                        })
                    else:
                        # Voter is already in waitlist
                        return jsonify({
                            'eligible': True,
                            'access_granted': False,
                            'election_full': True,
                            'voters_count': current_voters,
                            'max_concurrent_voters': max_concurrent,
                            'action': 'redirect_to_waitlist',
                            'already_in_waitlist': True
                        })
            
        except Exception as ex:
            db.session.rollback()
            print(f'Error in access_check: {ex}')
            return jsonify({'eligible': False, 'reason': 'Internal server error'}), 500

    @staticmethod
    def join_waitlist(election_id):
        data = request.json or {}
        voter_id = data.get('voter_id')
        if not voter_id:
            return jsonify({'error': 'voter_id required'}), 400
        election = Election.query.get(election_id)
        if not election or not election.queued_access:
            return jsonify({'error': 'Election not found or not using queued access'}), 404
        # Check if already in waitlist
        existing = ElectionWaitlist.query.filter_by(election_id=election_id, voter_id=voter_id, status='waiting').first()
        if existing:
            return jsonify({'message': 'Already in waitlist', 'position': ElectionWaitlist.query.filter_by(election_id=election_id, status='waiting').order_by(ElectionWaitlist.joined_at).all().index(existing) + 1}), 200
        # Count active voters
        active_count = ElectionWaitlist.query.filter_by(election_id=election_id, status='active').count()
        if active_count < (election.max_concurrent_voters or 1):
            # Grant immediate access
            entry = ElectionWaitlist(election_id=election_id, voter_id=voter_id, status='active')
            db.session.add(entry)
            db.session.commit()
            return jsonify({'message': 'Access granted', 'status': 'active'}), 200
        else:
            # Add to waitlist
            entry = ElectionWaitlist(election_id=election_id, voter_id=voter_id, status='waiting')
            db.session.add(entry)
            db.session.commit()
            position = ElectionWaitlist.query.filter_by(election_id=election_id, status='waiting').order_by(ElectionWaitlist.joined_at).all().index(entry) + 1
            return jsonify({'message': 'Added to waitlist', 'status': 'waiting', 'position': position}), 200
    
    @staticmethod
    def leave_waitlist(election_id):
        data = request.json or {}
        voter_id = data.get('voter_id')
        
        if not voter_id:
            return jsonify({'error': 'voter_id required'}), 400
            
        # Find the voter's waitlist entry
        entry = ElectionWaitlist.query.filter_by(
            election_id=election_id, 
            voter_id=voter_id
        ).filter(ElectionWaitlist.status.in_(['waiting', 'active'])).first()
        
        if not entry:
            return jsonify({'error': 'Not in waitlist'}), 404
            
        # Check if voter was active (currently voting) before removing entry
        was_active = entry.status == 'active'
        
        # Remove the voter from waitlist completely
        db.session.delete(entry)
        
        # If voter was active (currently voting), we need to decrement voters_count
        if was_active:
            election = Election.query.get(election_id)
            if election and election.voters_count and election.voters_count > 0:
                election.voters_count -= 1
                
        db.session.commit()
        
        return jsonify({'message': 'Left waitlist successfully'}), 200

    @staticmethod
    def waitlist_position(election_id):
        voter_id = request.args.get('voter_id')
        if not voter_id:
            return jsonify({'error': 'voter_id required'}), 400
        entry = ElectionWaitlist.query.filter_by(election_id=election_id, voter_id=voter_id, status='waiting').first()
        if not entry:
            return jsonify({'error': 'Not in waitlist'}), 404
        waitlist = ElectionWaitlist.query.filter_by(election_id=election_id, status='waiting').order_by(ElectionWaitlist.joined_at).all()
        position = waitlist.index(entry) + 1
        return jsonify({'position': position, 'total_waiting': len(waitlist)}), 200

    @staticmethod
    def next_in_waitlist(election_id):
        election = Election.query.get(election_id)
        if not election or not election.queued_access:
            return jsonify({'error': 'Election not found or not using queued access'}), 404
        # Count active voters
        active_count = ElectionWaitlist.query.filter_by(election_id=election_id, status='active').count()
        if active_count >= (election.max_concurrent_voters or 1):
            return jsonify({'message': 'No slot available'}), 200
        # Get next waiting
        next_entry = ElectionWaitlist.query.filter_by(election_id=election_id, status='waiting').order_by(ElectionWaitlist.joined_at).first()
        if not next_entry:
            return jsonify({'message': 'No one in waitlist'}), 200
        next_entry.status = 'active'
        db.session.commit()
        return jsonify({'message': 'Next voter activated', 'voter_id': next_entry.voter_id}), 200

    @staticmethod
    def get_active_voters(election_id):
        election = Election.query.get(election_id)
        if not election:
            return jsonify({'error': 'Election not found'}), 404
        
        if election.queued_access:
            # For queued elections, count the 'active' entries in waitlist
            active_count = ElectionWaitlist.query.filter_by(
                election_id=election_id, 
                status='active'
            ).count()
            return jsonify({'active_voters': active_count})
        else:
            # For non-queued elections, use the voters_count field
            count = election.voters_count or 0
            return jsonify({'active_voters': count})

    @staticmethod
    def get_eligible_voters(election_id):
        """Return the number of eligible voters for an election based on college affiliation."""
        election = Election.query.get(election_id)
        if not election:
            return jsonify({'error': 'Election not found'}), 404
        org = election.organization
        if not org:
            return jsonify({'error': 'Organization not found'}), 404
        
        # If organization has no college affiliation, election is open to all colleges
        if not org.college_id:
            count = Voter.query.count()
        else:
            # Election is restricted to voters from the same college as the organization
            count = Voter.query.filter_by(college_id=org.college_id).count()
        return jsonify({'eligible_voters': count})

    @staticmethod
    def get_waitlist_status(election_id):
        """Get comprehensive waitlist status for an election"""
        voter_id = request.args.get('voter_id')
        
        try:
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': 'Election not found'}), 404
            
            if not election.queued_access:
                return jsonify({'error': 'Election does not use queued access'}), 400
            
            # Get current active voters count
            active_count = ElectionWaitlist.query.filter_by(election_id=election_id, status='active').count()
            
            # Get total waitlist info
            waiting_entries = ElectionWaitlist.query.filter_by(
                election_id=election_id, status='waiting'
            ).order_by(ElectionWaitlist.joined_at).all()
            
            total_waiting = len(waiting_entries)
            max_concurrent = election.max_concurrent_voters or 1
            available_slots = max(0, max_concurrent - active_count)
            
            # Basic response data
            response_data = {
                'election_id': election_id,
                'election_name': election.election_name,
                'active_voters': active_count,
                'max_concurrent_voters': max_concurrent,
                'available_slots': available_slots,
                'total_waiting': total_waiting,
                'is_full': active_count >= max_concurrent,
                'estimated_wait_time_minutes': total_waiting * 12  # ~12 minutes per person average
            }
            
            # If voter_id provided, get specific voter info
            if voter_id:
                voter_entry = ElectionWaitlist.query.filter_by(
                    election_id=election_id, voter_id=voter_id
                ).filter(ElectionWaitlist.status.in_(['waiting', 'active'])).first()
                
                if voter_entry:
                    if voter_entry.status == 'waiting':
                        # Find position in queue
                        position = next((i + 1 for i, entry in enumerate(waiting_entries) 
                                       if entry.voter_id == voter_id), None)
                        response_data.update({
                            'voter_status': 'waiting',
                            'position_in_queue': position,
                            'is_next': position == 1,
                            'estimated_personal_wait_minutes': (position - 1) * 12 if position else 0
                        })
                    elif voter_entry.status == 'active':
                        response_data.update({
                            'voter_status': 'active',
                            'position_in_queue': 0,
                            'is_next': False,
                            'estimated_personal_wait_minutes': 0
                        })
                else:
                    response_data.update({
                        'voter_status': 'not_in_queue',
                        'position_in_queue': None,
                        'is_next': False,
                        'estimated_personal_wait_minutes': None
                    })
            
            return jsonify(response_data), 200
            
        except Exception as ex:
            print(f'Error in get_waitlist_status: {ex}')
            return jsonify({'error': 'Failed to get waitlist status'}), 500
