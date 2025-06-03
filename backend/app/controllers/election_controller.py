from app.models.election import Election
from app.models.organization import Organization
from app.models.candidate import Candidate
from app.models.election_result import ElectionResult
from app import db
from flask import jsonify, request, current_app
from datetime import datetime
from app.models.election_waitlist import ElectionWaitlist
from app.models.voter import Voter
from app.models.position import Position
from app.models.vote import Vote
from app.controllers.auth_controller import AuthController
import os
import uuid
import json
from werkzeug.utils import secure_filename

class ElectionController:
    @staticmethod
    def get_all():
        try:
            elections = Election.query.all()
            result = []
            now = datetime.utcnow().date()            
            for e in elections:
                # First check if election has results and should be marked as 'Finished'
                results_updated = ElectionController._check_and_update_election_with_results(e)
                if results_updated:
                    db.session.add(e)  # Mark for update
                
                # Check if election has results - if so, don't override 'Finished' status
                existing_results = ElectionResult.query.filter_by(election_id=e.election_id).first()
                
                # Use the stored election_status as the primary source of truth
                status = e.election_status
                
                # Only update status based on dates if election has NO results
                if not existing_results:
                    # Auto-update status if dates indicate it should change
                    if now > e.date_end and e.election_status not in ['Finished', 'Canceled']:
                        # Election has ended but status hasn't been updated - fix it
                        status = 'Finished'
                        e.election_status = 'Finished'
                        db.session.add(e)  # Mark for update
                    elif e.date_start and e.date_start > now and e.election_status not in ['Upcoming', 'Canceled']:
                        # Election hasn't started yet
                        status = 'Upcoming'
                        e.election_status = 'Upcoming'
                        db.session.add(e)  # Mark for update
                    elif e.date_start and e.date_start <= now <= e.date_end and e.election_status not in ['Ongoing', 'Canceled', 'Finished']:
                        # Election should be ongoing
                        status = 'Ongoing'
                        e.election_status = 'Ongoing'
                        db.session.add(e)  # Mark for update
                # If election has results, preserve 'Finished' status and don't change it
                # Fetch college_name and college_id from organization relationship
                college_name = None
                college_id = None
                org_name = None
                if e.organization:
                    org_name = e.organization.org_name
                    if e.organization.college:
                        college_name = e.organization.college.college_name
                        college_id = e.organization.college.college_id
                result.append({
                    "election_id": e.election_id,
                    "election_name": e.election_name,
                    "election_desc": e.election_desc,
                    "election_status": status,
                    "date_start": e.date_start.isoformat() if e.date_start else None,
                    "date_end": e.date_end.isoformat() if e.date_end else None,
                    "organization": {
                        "org_name": org_name,
                        "college_id": college_id,
                        "college_name": college_name
                    } if e.organization else None,
                    "voters_count": e.voters_count if hasattr(e, "voters_count") else 0,
                    "participation_rate": e.participation_rate if hasattr(e, "participation_rate") else None,
                    "queued_access": getattr(e, "queued_access", False),                    "max_concurrent_voters": getattr(e, "max_concurrent_voters", None),
                    "org_id": e.org_id
                })
            
            # Commit any status updates we made
            try:
                db.session.commit()
            except Exception as commit_ex:
                print("Error committing status updates:", commit_ex)
                db.session.rollback()
            
            return jsonify(result)
        except Exception as ex:
            print("Error in get_all elections:", ex)
            db.session.rollback()
            return jsonify({"error": str(ex)}), 500    @staticmethod
    def get_ongoing():
        try:
            now = datetime.utcnow().date()
            # Get elections where start_date <= today <= end_date
            ongoing_elections = Election.query.filter(
                Election.date_start <= now,
                Election.date_end >= now,
                Election.election_status == 'Ongoing'
            ).all()
            result = []
            for e in ongoing_elections:
                # Check if election has results and should be marked as 'Finished'
                results_updated = ElectionController._check_and_update_election_with_results(e)
                if results_updated:
                    db.session.add(e)  # Mark for update
                    # Skip this election from ongoing list if it was updated to Finished
                    continue
                
                election_data = {
                    'election_id': e.election_id,
                    'election_name': e.election_name,
                    'election_desc': e.election_desc,
                    'date_start': e.date_start.isoformat() if e.date_start else None,
                    'date_end': e.date_end.isoformat() if e.date_end else None,
                    'election_status': e.election_status,
                    'queued_access': e.queued_access,
                    'max_concurrent_voters': e.max_concurrent_voters
                }
                
                # Add organization info if available
                if e.organization:
                    election_data['organization'] = {
                        'org_id': e.organization.org_id,
                        'org_name': e.organization.org_name,
                        'college_name': e.organization.college.college_name if e.organization.college else None
                    }                
                result.append(election_data)
            
            # Commit any status updates we made
            try:
                db.session.commit()
            except Exception as commit_ex:
                db.session.rollback()
                print(f"Warning: Could not update election statuses: {commit_ex}")
            
            return jsonify(result)
        except Exception as ex:
            print("Error in get_ongoing elections:", ex)
            return jsonify([]), 500

    @staticmethod
    def create():
        try:
            data = request.json
            # Parse dates
            date_start = data.get('date_start')
            date_end = data['date_end']
            if isinstance(date_start, str):
                date_start = datetime.fromisoformat(date_start).date()
            if isinstance(date_end, str):
                date_end = datetime.fromisoformat(date_end).date()
            now = datetime.utcnow().date()
            # Determine status
            if date_start > now:
                status = 'Upcoming'
            elif date_start <= now <= date_end:
                status = 'Ongoing'
            elif now > date_end:
                status = 'Finished'
            else:
                status = data.get('election_status', 'Upcoming')
                
            election = Election(
                org_id=data['org_id'],
                election_name=data['election_name'],
                election_desc=data.get('election_desc'),
                election_status=status,
                date_start=date_start,
                date_end=date_end,
                queued_access=data.get('queued_access', False),
                max_concurrent_voters=data.get('max_concurrent_voters')
            )
            db.session.add(election)
            db.session.commit()

            # Handle candidates if provided
            candidates = data.get('candidates', [])
            for cand in candidates:
                candidate = Candidate(
                    election_id=election.election_id,
                    fullname=cand['fullname'],
                    position_id=cand['position_id'],
                    party=cand.get('party'),
                    candidate_desc=cand.get('candidate_desc')
                )
                db.session.add(candidate)
              # Handle crypto_id if provided - link crypto config to this election
            crypto_id = data.get('crypto_id')
            crypto_data = data.get('crypto_data')
            
            if crypto_id:
                try:
                    from app.controllers.crypto_config_controller import CryptoConfigController
                    # Update the crypto config with the new election ID
                    crypto_result = CryptoConfigController.update_election_id(crypto_id, election.election_id)
                    print(f"Updated crypto config {crypto_id} to election {election.election_id}")
                except Exception as crypto_ex:
                    print(f"Error updating crypto config: {crypto_ex}")
                    # Don't fail the whole transaction if crypto linking fails
            # Handle crypto data if provided directly
            elif crypto_data:
                try:
                    from app.controllers.crypto_config_controller import CryptoConfigController
                    # Store the crypto data
                    crypto_data['election_id'] = election.election_id
                    crypto_result = CryptoConfigController.store_election_crypto_data(crypto_data)
                    print(f"Stored crypto data for election {election.election_id}")
                except Exception as crypto_ex:
                    print(f"Error storing crypto data: {crypto_ex}")
                    # Don't fail the whole transaction if crypto storing fails
            
            db.session.commit()

            return jsonify({
                'election_id': election.election_id,
                'election_name': election.election_name,
                'queued_access': election.queued_access,
                'max_concurrent_voters': election.max_concurrent_voters,
                'crypto_id': crypto_id if crypto_id else None
            }), 201
        except Exception as ex:
            db.session.rollback()
            print("Error in create election:", ex)
            return jsonify({"error": str(ex)}), 500

    @staticmethod
    def update(election_id):
        try:
            data = request.json
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': 'Election not found'}), 404            # Check if election has results first - this takes precedence
            results_updated = ElectionController._check_and_update_election_with_results(election)
            
            # Parse and update date fields if present
            if 'date_start' in data:
                date_start = data['date_start']
                if isinstance(date_start, str):
                    date_start = datetime.fromisoformat(date_start).date()
                election.date_start = date_start
            if 'date_end' in data:
                date_end = data['date_end']
                if isinstance(date_end, str):
                    date_end = datetime.fromisoformat(date_end).date()
                election.date_end = date_end            
            
            # Update other fields if present in request
            if 'election_name' in data:
                election.election_name = data['election_name']
            if 'election_desc' in data:
                election.election_desc = data['election_desc']
            if 'org_id' in data:
                election.org_id = data['org_id']            
                if 'election_status' in data:
                # Check if election has results - if so, warn about override attempt
                    existing_results = ElectionResult.query.filter_by(election_id=election_id).first()
                if existing_results and data['election_status'] != 'Finished':
                    print(f"Warning: Attempt to set election {election_id} status to '{data['election_status']}' but election has results. Keeping 'Finished' status.")
                    # Don't change status if election has results unless explicitly setting to Finished
                elif data['election_status'] == 'Finished' and election.election_status != 'Finished':
                    # If manually setting status to 'Finished', update the end date
                    election.date_end = datetime.utcnow().date()
                    election.election_status = data['election_status']
                elif not existing_results:
                    # Only allow status changes if no results exist
                    election.election_status = data['election_status']
            
            if 'queued_access' in data:
                election.queued_access = data['queued_access']
            if 'max_concurrent_voters' in data:
                election.max_concurrent_voters = data['max_concurrent_voters']
            
            # If no explicit status was provided, auto-determine status based on dates
            # But don't override 'Finished' status if election has results
            if 'election_status' not in data:
                existing_results = ElectionResult.query.filter_by(election_id=election_id).first()
                if not existing_results:  # Only auto-update status if no results exist
                    ds = election.date_start
                    de = election.date_end
                    if isinstance(ds, str):
                        ds = datetime.fromisoformat(ds).date()
                    if isinstance(de, str):
                        de = datetime.fromisoformat(de).date()
                    now = datetime.utcnow().date()
                    if ds > now:
                        status = 'Upcoming'
                    elif ds <= now <= de:
                        status = 'Ongoing'
                    elif now > de:
                        status = 'Finished'
                        # Auto-update end date when status becomes 'Finished' due to date
                        if election.election_status != 'Finished':
                            election.date_end = now
                    else:
                        status = election.election_status
                    election.election_status = status

            db.session.commit()
            return jsonify({'message': 'Election updated successfully', 'election_id': election.election_id, 'election_name': election.election_name, 'election_desc': election.election_desc, 'election_status': election.election_status, 'date_start': election.date_start.isoformat(), 'date_end': election.date_end.isoformat(), 'queued_access': election.queued_access, 'max_concurrent_voters': election.max_concurrent_voters}), 200
        except Exception as ex:
            db.session.rollback()
            print('Error in update election:', ex)
            return jsonify({'error': f'Failed to update election: {str(ex)}'}), 500

    @staticmethod
    def delete(election_id):
        try:
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': 'Election not found'}), 404

            # 1. Delete all votes cast in this election
            from app.models.vote import Vote
            Vote.query.filter_by(election_id=election_id).delete()

            # 2. Delete all election results for this election (MUST be before deleting candidates)
            from app.models.election_result import ElectionResult
            ElectionResult.query.filter_by(election_id=election_id).delete()

            # 3. Delete all candidates linked to this election (and their photos)
            from app.models.candidate import Candidate
            candidates = Candidate.query.filter_by(election_id=election_id).all()
            for cand in candidates:
                if cand.photo_path:
                    uploads_dir = os.path.join(os.getcwd(), 'uploads')
                    abs_photo_path = os.path.join(uploads_dir, cand.photo_path)
                    if os.path.exists(abs_photo_path):
                        try:
                            os.remove(abs_photo_path)
                        except Exception as e:
                            print(f"Failed to remove candidate photo {abs_photo_path}: {e}")
                db.session.delete(cand)

            # 4. Delete all key shares and crypto configs linked to this election
            from app.models.crypto_config import CryptoConfig
            from app.models.key_share import KeyShare
            from app.models.trusted_authority import TrustedAuthority
            crypto_configs = CryptoConfig.query.filter_by(election_id=election_id).all()
            authority_ids_to_delete = set()
            for crypto in crypto_configs:
                key_shares = KeyShare.query.filter_by(crypto_id=crypto.crypto_id).all()
                for ks in key_shares:
                    authority_ids_to_delete.add(ks.authority_id)
                KeyShare.query.filter_by(crypto_id=crypto.crypto_id).delete()
                db.session.delete(crypto)

            for authority_id in authority_ids_to_delete:
                other_shares = KeyShare.query.filter_by(authority_id=authority_id).count()
                if other_shares == 0:
                    ta = TrustedAuthority.query.get(authority_id)
                    if ta:
                        db.session.delete(ta)

            from app.models.election_waitlist import ElectionWaitlist
            ElectionWaitlist.query.filter_by(election_id=election_id).delete()

            db.session.delete(election)
            db.session.commit()
            return jsonify({'message': 'Election and all related data deleted successfully'})
        except Exception as ex:
            db.session.rollback()
            print('Error in delete election:', ex)
            return jsonify({'error': f'Failed to delete election: {str(ex)}'}), 500

    @staticmethod
    def join_waitlist(election_id):
        from app.models.election_waitlist import ElectionWaitlist
        from app.models.election import Election
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
        else:            # Add to waitlist
            entry = ElectionWaitlist(election_id=election_id, voter_id=voter_id, status='waiting')
            db.session.add(entry)
            db.session.commit()
            position = ElectionWaitlist.query.filter_by(election_id=election_id, status='waiting').order_by(ElectionWaitlist.joined_at).all().index(entry) + 1
            return jsonify({'message': 'Added to waitlist', 'status': 'waiting', 'position': position}), 200
    
    @staticmethod
    def leave_waitlist(election_id):
        from app.models.election_waitlist import ElectionWaitlist
        from app.models.election import Election
        
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
        from app.models.election_waitlist import ElectionWaitlist
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
        from app.models.election_waitlist import ElectionWaitlist
        from app.models.election import Election
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
            from app.models.election_waitlist import ElectionWaitlist
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
        else:        # Election is restricted to voters from the same college as the organization
            count = Voter.query.filter_by(college_id=org.college_id).count()
        return jsonify({'eligible_voters': count})    @staticmethod
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
            from app.models.vote import Vote
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
                # Non-queued elections: No limit on voter count, just increment for each successful access check
                old_count = election.voters_count or 0
                election.voters_count = old_count + 1
                db.session.commit()
                print(f"DEBUG: Non-queued election - incremented voters_count from {old_count} to {election.voters_count}")
                return jsonify({
                    'eligible': True, 
                    'access_granted': True,
                    'voters_count': election.voters_count,
                    'action': 'redirect_to_cast'
                })
            else:
                from app.models.election_waitlist import ElectionWaitlist
                
                # Check if voter is coming from waitlist activation
                active_waitlist_entry = ElectionWaitlist.query.filter_by(
                    election_id=election_id, 
                    voter_id=voter_id, 
                    status='active'                ).first()
                
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
            return jsonify({'error': 'Failed to fetch candidates'}), 500    
    
    @staticmethod
    def submit_vote(election_id):
        """Submit a vote for an election. Enforce one per position, one per election per voter."""
        try:
            data = request.json or {}
            print('DEBUG submit_vote payload:', data)
            student_id = data.get('student_id')
            votes = data.get('votes')  # [{position_id, candidate_id, encrypted_vote, zkp_proof, verification_receipt}]
            
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
                    vote_status='cast'                )
                db.session.add(vote)
                  # Update participation rate based on actual votes cast
            election = Election.query.get(election_id)
            if election and election.organization:
                if election.organization.college_id:
                    # Election is restricted to one college
                    eligible_voters = Voter.query.filter_by(college_id=election.organization.college_id).count()
                else:
                    # Election is open to all colleges
                    eligible_voters = Voter.query.count()
                
                if eligible_voters > 0:
                    # Get actual vote count for this election
                    actual_votes_count = Vote.query.filter_by(election_id=election_id).count()
                    election.participation_rate = (actual_votes_count / eligible_voters) * 100
                
            db.session.commit()
            print('DEBUG submit_vote success')
            return jsonify({
                'message': 'Vote submitted successfully',
                'votes_count': len(votes),
                'election_id': election_id,
                'total_voters': election.voters_count if election else None
            })
            
        except Exception as ex:
            db.session.rollback()
            print('Error in submit_vote:', ex)
            return jsonify({'error': 'Failed to submit vote'}), 500

    @staticmethod
    def add_candidate(election_id):
        try:
            # Handle form data for file upload
            data = request.form.to_dict() if request.form else request.json or {}
            photo = request.files.get('photo')
            photo_metadata = json.loads(request.form.get('photo_metadata', '{}')) if request.form and request.form.get('photo_metadata') else {}
            
            fullname = data.get('fullname')
            position_id = data.get('position_id')
            party = data.get('party')
            candidate_desc = data.get('candidate_desc')
            if not fullname:
                return jsonify({'error': 'fullname is required'}), 400
            
            # Convert position_id to None if empty string or invalid
            if position_id == '' or position_id == 'None':
                position_id = None
            elif position_id:
                try:
                    position_id = int(position_id)
                except (ValueError, TypeError):
                    position_id = None

            photo_path = None
            if photo and AuthController.allowed_file(photo.filename):
                # Use the configured uploads directory
                uploads_dir = current_app.config.get('UPLOADS_FOLDER')
                photos_dir = os.path.join(uploads_dir, 'photos')
                os.makedirs(photos_dir, exist_ok=True)
                unique_filename = f"{uuid.uuid4().hex}_{secure_filename(photo.filename)}"
                abs_photo_path = os.path.join(photos_dir, unique_filename)
                photo.save(abs_photo_path)
                # Store relative path in the database for URL generation
                photo_path = f"photos/{unique_filename}"
                # Fallback for missing metadata
                if not photo_metadata:
                    photo_metadata = {
                        "name": photo.filename,
                        "size": os.path.getsize(abs_photo_path),
                        "type": photo.mimetype
                    }

            candidate = Candidate(
                election_id=election_id,
                fullname=fullname,
                position_id=position_id,
                party=party,
                candidate_desc=candidate_desc,
                photo_path=photo_path,
                photo_metadata=json.dumps(photo_metadata) if photo_metadata else None
            )
            db.session.add(candidate)
            db.session.commit()
            return jsonify({'message': 'Candidate added', 'candidate_id': candidate.candidate_id}), 201
        except Exception as ex:
            db.session.rollback()
            print('Error in add_candidate:', ex)
            return jsonify({'error': 'Failed to add candidate'}), 500

    @staticmethod
    def edit_candidate(candidate_id):
        try:
            # Handle form data for file upload
            data = request.form.to_dict() if request.form else request.json or {}
            photo = request.files.get('photo')
            photo_metadata = json.loads(request.form.get('photo_metadata', '{}'))
            
            candidate = Candidate.query.get(candidate_id)
            if not candidate:
                return jsonify({'error': 'Candidate not found'}), 404
                  # Update candidate details
            if 'fullname' in data:
                candidate.fullname = data['fullname']
            if 'position_id' in data:
                position_id = data['position_id']
                # Convert position_id to None if empty string or invalid
                if position_id == '' or position_id == 'None':
                    candidate.position_id = None
                elif position_id:
                    try:
                        candidate.position_id = int(position_id)
                    except (ValueError, TypeError):
                        candidate.position_id = None
                else:
                    candidate.position_id = None
            if 'party' in data:
                candidate.party = data['party']
            if 'candidate_desc' in data:
                candidate.candidate_desc = data['candidate_desc']
                  # Handle photo upload if provided
            if photo and AuthController.allowed_file(photo.filename):
                # Remove old photo if it exists
                if candidate.photo_path:
                    uploads_dir = current_app.config.get('UPLOADS_FOLDER')
                    old_photo_path = os.path.join(uploads_dir, candidate.photo_path)
                    if os.path.exists(old_photo_path):
                        try:
                            os.remove(old_photo_path)
                        except Exception as e:
                            print(f"Failed to remove old photo: {e}")
                
                # Save new photo
                unique_filename = f"{uuid.uuid4().hex}_{secure_filename(photo.filename)}"
                # Create absolute path for storage
                uploads_dir = current_app.config.get('UPLOADS_FOLDER')
                photos_dir = os.path.join(uploads_dir, 'photos')
                os.makedirs(photos_dir, exist_ok=True)
                abs_photo_path = os.path.join(photos_dir, unique_filename)
                photo.save(abs_photo_path)
                # Store relative path in the database for URL generation
                photo_path = f"photos/{unique_filename}"
                  # Update candidate record
                candidate.photo_path = photo_path
                
                # Fallback for missing metadata
                if not photo_metadata:
                    photo_metadata = {
                        "name": photo.filename,
                        "size": os.path.getsize(abs_photo_path),
                        "type": photo.mimetype
                    }
                candidate.photo_metadata = json.dumps(photo_metadata)
                
            db.session.commit()
            return jsonify({'message': 'Candidate updated'}), 200
        except Exception as ex:
            db.session.rollback()
            print('Error in edit_candidate:', ex)
            return jsonify({'error': 'Failed to update candidate'}), 500

    @staticmethod
    def delete_candidate(candidate_id):
        try:
            candidate = Candidate.query.get(candidate_id)
            if not candidate:
                return jsonify({'error': 'Candidate not found'}), 404
            db.session.delete(candidate)
            db.session.commit()
            return jsonify({'message': 'Candidate deleted'}), 200
        except Exception as ex:
            db.session.rollback()
            print('Error in delete_candidate:', ex)
            return jsonify({'error': 'Failed to delete candidate'}), 500

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
            return jsonify({'error': 'Failed to fetch votes'}), 500    @staticmethod
    def send_vote_receipt(election_id):
        try:
            data = request.json or {}
            student_id = data.get('student_id')
            if not student_id:
                return jsonify({'error': 'student_id required'}), 400
            
            # Get voter
            voter = Voter.query.get(student_id)
            if not voter:
                return jsonify({'error': 'Voter not found'}), 404
            
            # Get election
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': 'Election not found'}), 404
            
            # Get votes
            from app.models.vote import Vote, Candidate, Position
            votes = (
                db.session.query(Vote, Candidate, Position)
                .join(Candidate, Vote.candidate_id == Candidate.candidate_id)
                .join(Position, Candidate.position_id == Position.position_id)
                .filter(Vote.election_id == election_id, Vote.student_id == student_id)
                .all()
            )
            if not votes:
                return jsonify({'error': 'No votes found for this voter in this election'}), 404
            
            # Compose email
            from flask_mail import Message
            vote_rows = "".join([
                f"<tr><td style='padding:8px;border:1px solid #eee'>{v[2].position_name}</td>"
                f"<td style='padding:8px;border:1px solid #eee'>{v[1].fullname}</td>"
                f"<td style='padding:8px;border:1px solid #eee'>{v[1].party or ''}</td></tr>"
                for v in votes
            ])
            html = f"""
            <div style='font-family:sans-serif;background:#f9fafb;padding:32px;'>
              <div style='max-width:480px;margin:auto;background:#fff;border-radius:12px;box-shadow:0 2px 8px #0001;padding:32px;'>
                <h2 style='color:#1a202c;text-align:center;margin-bottom:24px;'>Your Vote Receipt</h2>
                <p style='color:#333;text-align:center;'>Thank you for voting in <b>{election.election_name}</b>!</p>
                <table style='width:100%;border-collapse:collapse;margin:24px 0;'>
                  <thead>
                    <tr style='background:#fef9c3;'>
                      <th style='padding:8px;border:1px solid #eee;text-align:left;'>Position</th>
                      <th style='padding:8px;border:1px solid #eee;text-align:left;'>Candidate</th>
                      <th style='padding:8px;border:1px solid #eee;text-align:left;'>Party</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vote_rows}
                  </tbody>
                </table>
                <p style='color:#666;font-size:13px;text-align:center;'>This is your official vote receipt. Please keep it for your records.<br/>If you did not cast this vote, contact the election administrator immediately.</p>
                <div style='text-align:center;margin-top:24px;'>
                  <img src='https://www.usep.edu.ph/wp-content/uploads/2022/09/USEP-Logo-Profile-1.png' alt='USEP Logo' style='width:80px;opacity:0.7;margin:auto;' />
                </div>
              </div>
            </div>
            """
            msg = Message(
                subject=f"Vote Receipt for {election.election_name}",
                recipients=[voter.student_email],
                html=html
            )
            from app import mail
            mail.send(msg)
            
            # NOTE: voters_count decrement is handled by leave_voting_session endpoint
            # when the voter completes their voting process, so we don't decrement here
            # to avoid double decrementing
            db.session.commit()
            
            return jsonify({
                'message': 'Vote receipt sent successfully',
                'voters_count': election.voters_count
            })
            
        except Exception as ex:
            db.session.rollback()
            print('Error in send_vote_receipt:', ex)
            return jsonify({'error': 'Failed to send vote receipt'}), 500

    @staticmethod
    def get_election_results():
        try:
            # Only include finished elections
            finished_elections = (
                Election.query.filter(Election.election_status == 'Finished').all()
            )
            results = []
            for election in finished_elections:
                # Get all candidates for this election
                candidates = Candidate.query.filter_by(election_id=election.election_id).all()
                # Get all votes for this election
                votes = Vote.query.filter_by(election_id=election.election_id).all()
                total_votes = len(votes)
                # Count votes per candidate
                candidate_vote_counts = {c.candidate_id: 0 for c in candidates}
                for v in votes:
                    if v.candidate_id in candidate_vote_counts:
                        candidate_vote_counts[v.candidate_id] += 1
                # Build candidate breakdown
                candidate_breakdown = []
                max_votes = max(candidate_vote_counts.values()) if candidate_vote_counts else 0
                winners = [c for c in candidates if candidate_vote_counts[c.candidate_id] == max_votes and max_votes > 0]
                for c in candidates:
                    votes_count = candidate_vote_counts[c.candidate_id]
                    percentage = (votes_count / total_votes * 100) if total_votes > 0 else 0
                    candidate_breakdown.append({
                        'name': c.fullname,
                        'votes': votes_count,
                        'percentage': round(percentage, 1),
                        'winner': votes_count == max_votes and max_votes > 0
                    })                # Compute participation rate based on total registered voters
                participation_rate = None
                if election.organization and election.organization.college_id:
                    # Election is restricted to one college
                    total_registered_voters = Voter.query.filter_by(college_id=election.organization.college_id).count()
                else:
                    # Election is open to all colleges
                    total_registered_voters = Voter.query.count()
                
                if total_registered_voters > 0:
                    participation_rate = round((total_votes / total_registered_voters) * 100, 1)
                # Compose result object
                results.append({
                    'election_id': election.election_id,
                    'election_name': election.election_name,
                    'organization': election.organization.org_name if election.organization else '',
                    'ended_at': election.date_end.isoformat() if election.date_end else '',
                    'winner': ', '.join([w.fullname for w in winners]) if winners else 'No winner',
                    'total_votes': total_votes,
                    'participation_rate': participation_rate if participation_rate is not None else 0,
                    'candidates': candidate_breakdown
                })
            return jsonify(results)
        except Exception as ex:
            print('Error in get_election_results:', ex)
            return jsonify([]), 500

    @staticmethod
    def get_crypto_config(election_id):
        """Get the crypto configuration for an election"""
        try:
            from app.models.crypto_config import CryptoConfig
            
            crypto_config = CryptoConfig.query.filter_by(
                election_id=election_id,
                status='active'
            ).first()
            
            if not crypto_config:
                return jsonify({'error': 'No crypto configuration found for this election'}), 404
                
            return jsonify({
                'crypto_id': crypto_config.crypto_id,
                'public_key': crypto_config.public_key,
                'key_type': crypto_config.key_type,
                'meta_data': crypto_config.meta_data
            }), 200
            
        except Exception as ex:
            print('Error in get_crypto_config:', ex)
            return jsonify({'error': 'Failed to fetch crypto configuration'}), 500
    
    @staticmethod
    def _check_and_update_election_with_results(election):
        """
        Helper method to check if an election has results and automatically 
        set its status to 'Finished' if results exist.
        Returns True if the election was updated, False otherwise.
        """
        try:
            # Check if election already has results
            existing_results = ElectionResult.query.filter_by(election_id=election.election_id).first()
            
            if existing_results and election.election_status != 'Finished':
                # Election has results but status is not 'Finished' - override it
                election.election_status = 'Finished'
                election.date_end = election.date_end or datetime.utcnow().date()
                print(f"Auto-updated election {election.election_id} status to 'Finished' due to existing results")
                return True
            return False
        except Exception as ex:
            print(f"Error checking election results for election {election.election_id}: {ex}")
            return False

    @staticmethod
    def get_waitlist_status(election_id):
        """Get comprehensive waitlist status for an election"""
        from app.models.election_waitlist import ElectionWaitlist
        from app.models.election import Election
        
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
            return jsonify({'error': 'Failed to get waitlist status'}), 500    @staticmethod
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
                from app.models.election_waitlist import ElectionWaitlist
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
            return jsonify({'error': 'Failed to leave voting session'}), 500    @staticmethod
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
                from app.models.election_waitlist import ElectionWaitlist
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
            current_app.logger.error(f"Error decrementing voters count for election {election_id}: {str(ex)}")
            return jsonify({'error': 'Failed to decrement voters count'}), 500