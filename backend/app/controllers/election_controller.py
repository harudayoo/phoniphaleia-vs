from app.models.election import Election
from app.models.organization import Organization
from app.models.candidate import Candidate
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
                # Determine status
                if e.date_start > now:
                    status = 'Upcoming'
                elif e.date_start <= now <= e.date_end:
                    status = 'Ongoing'
                elif now > e.date_end:
                    status = 'Finished'
                else:
                    status = e.election_status  # fallback
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
                    "queued_access": getattr(e, "queued_access", False),
                    "max_concurrent_voters": getattr(e, "max_concurrent_voters", None),
                    "org_id": e.org_id
                })
            return jsonify(result)
        except Exception as ex:
            print("Error in get_all elections:", ex)
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
            if crypto_id:
                try:
                    from app.controllers.crypto_config_controller import CryptoConfigController
                    # Update the crypto config with the new election ID
                    
                    crypto_result = CryptoConfigController.update_election_id(crypto_id, election.election_id)
                    print(f"Updated crypto config {crypto_id} to election {election.election_id}")
                except Exception as crypto_ex:
                    print(f"Error updating crypto config: {crypto_ex}")
                    # Don't fail the whole transaction if crypto linking fails
            
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
                return jsonify({'error': 'Election not found'}), 404

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
            if 'queued_access' in data:
                election.queued_access = data['queued_access']
            if 'max_concurrent_voters' in data:
                election.max_concurrent_voters = data['max_concurrent_voters']

            # Ensure date fields are datetime.date for comparison
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

            # 2. Delete all candidates linked to this election (and their photos)
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

            # 3. Delete all key shares and crypto configs linked to this election
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

            from app.models.election_result import ElectionResult
            ElectionResult.query.filter_by(election_id=election_id).delete()

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
        else:
            # Add to waitlist
            entry = ElectionWaitlist(election_id=election_id, voter_id=voter_id, status='waiting')
            db.session.add(entry)
            db.session.commit()
            position = ElectionWaitlist.query.filter_by(election_id=election_id, status='waiting').order_by(ElectionWaitlist.joined_at).all().index(entry) + 1
            return jsonify({'message': 'Added to waitlist', 'status': 'waiting', 'position': position}), 200

    @staticmethod
    def leave_waitlist(election_id):
        from app.models.election_waitlist import ElectionWaitlist
        data = request.json or {}
        voter_id = data.get('voter_id')
        if not voter_id:
            return jsonify({'error': 'voter_id required'}), 400
        entry = ElectionWaitlist.query.filter_by(election_id=election_id, voter_id=voter_id).filter(ElectionWaitlist.status.in_(['waiting', 'active'])).first()
        if not entry:
            return jsonify({'error': 'Not in waitlist'}), 404
        entry.status = 'done'
        db.session.commit()
        return jsonify({'message': 'Left waitlist'}), 200

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
        count = ElectionWaitlist.query.filter_by(election_id=election_id, status='active').count()
        return jsonify({'active_voters': count})

    @staticmethod
    def get_eligible_voters(election_id):
        """Return the number of eligible voters for an election (same college as org)."""
        election = Election.query.get(election_id)
        if not election:
            return jsonify({'error': 'Election not found'}), 404
        org = election.organization
        if not org or not org.college_id:
            return jsonify({'eligible_voters': 0})
        count = Voter.query.filter_by(college_id=org.college_id).count()
        return jsonify({'eligible_voters': count})

    @staticmethod
    def access_check(election_id):
        data = request.json or {}
        voter_id = data.get('voter_id')
        if not voter_id:
            return jsonify({'eligible': False, 'reason': 'No voter_id provided'}), 400
        election = Election.query.get(election_id)
        if not election or not election.organization or not election.organization.college_id:
            return jsonify({'eligible': False, 'reason': 'Election or organization/college not found'}), 404
        voter = Voter.query.get(voter_id)
        if not voter:
            return jsonify({'eligible': False, 'reason': 'Voter not found'}), 404
        if voter.college_id != election.organization.college_id:
            return jsonify({'eligible': False, 'reason': 'Voter not in the same college as election'}), 403
        return jsonify({'eligible': True})

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
            student_id = data.get('student_id')
            votes = data.get('votes')  # [{position_id, candidate_id, encrypted_vote, zkp_proof, verification_receipt}]
            if not student_id or not isinstance(votes, list):
                return jsonify({'error': 'Missing student_id or votes'}), 400
            # Check for duplicate vote for this election
            existing = Vote.query.filter_by(election_id=election_id, student_id=student_id).first()
            if existing:
                return jsonify({'error': 'You have already voted in this election.'}), 400
            # Enforce one vote per position
            seen_positions = set()
            for v in votes:
                pos_id = v.get('position_id')
                if pos_id in seen_positions:
                    return jsonify({'error': 'Multiple votes for the same position are not allowed.'}), 400
                seen_positions.add(pos_id)
            # Save votes
            for v in votes:
                vote = Vote(
                    election_id=election_id,
                    student_id=student_id,
                    candidate_id=v['candidate_id'],
                    encrypted_vote=v.get('encrypted_vote', ''),
                    zkp_proof=v.get('zkp_proof', ''),
                    verification_receipt=v.get('verification_receipt', ''),
                    vote_status='cast'
                )
                db.session.add(vote)
            db.session.commit()
            return jsonify({'message': 'Vote submitted successfully'})
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
            if not fullname or not position_id:
                return jsonify({'error': 'fullname and position_id are required'}), 400

            photo_path = None
            if photo and AuthController.allowed_file(photo.filename):
                # Ensure the uploads/photos directory exists at the project root
                uploads_dir = os.path.join(os.getcwd(), 'uploads')
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
                candidate.position_id = data['position_id']
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
            return jsonify({'error': 'Failed to fetch votes'}), 500

    @staticmethod
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
            return jsonify({'message': 'Vote receipt sent successfully'})
        except Exception as ex:
            print('Error in send_vote_receipt:', ex)
            return jsonify({'error': 'Failed to send vote receipt'}), 500