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
            return jsonify({"error": str(ex)}), 500
            
    @staticmethod
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