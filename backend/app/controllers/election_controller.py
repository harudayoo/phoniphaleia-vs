from app.models.election import Election
from app.models.organization import Organization
from app import db
from flask import jsonify, request
from datetime import datetime

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
                result.append({
                    "election_id": e.election_id,
                    "election_name": e.election_name,
                    "election_desc": e.election_desc,
                    "election_status": status,
                    "date_start": e.date_start.isoformat() if e.date_start else None,
                    "date_end": e.date_end.isoformat() if e.date_end else None,
                    "organization": {
                        "org_name": e.organization.org_name if e.organization else None
                    },
                    "voters_count": e.voters_count if hasattr(e, "voters_count") else 0,
                    "participation_rate": e.participation_rate if hasattr(e, "participation_rate") else None,
                    "queued_access": getattr(e, "queued_access", False),
                    "max_concurrent_voters": getattr(e, "max_concurrent_voters", None)
                })
            return jsonify(result)
        except Exception as ex:
            print("Error in get_all elections:", ex)
            return jsonify({"error": str(ex)}), 500

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
            return jsonify({
                'election_id': election.election_id,
                'election_name': election.election_name,
                'queued_access': election.queued_access,
                'max_concurrent_voters': election.max_concurrent_voters
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

            # Update fields if present in request
            if 'election_name' in data:
                election.election_name = data['election_name']
            if 'election_desc' in data:
                election.election_desc = data['election_desc']
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
            if 'org_id' in data:
                election.org_id = data['org_id']
            if 'queued_access' in data:
                election.queued_access = data['queued_access']
            if 'max_concurrent_voters' in data:
                election.max_concurrent_voters = data['max_concurrent_voters']

            # Determine status after possible date changes
            now = datetime.utcnow().date()
            if election.date_start > now:
                status = 'Upcoming'
            elif election.date_start <= now <= election.date_end:
                status = 'Ongoing'
            elif now > election.date_end:
                status = 'Finished'
            else:
                status = election.election_status
            election.election_status = status

            db.session.commit()
            return jsonify({
                'election_id': election.election_id,
                'election_name': election.election_name,
                'election_desc': election.election_desc,
                'election_status': election.election_status,
                'date_start': election.date_start.isoformat() if election.date_start else None,
                'date_end': election.date_end.isoformat() if election.date_end else None,
                'org_id': election.org_id
            })
        except Exception as ex:
            db.session.rollback()
            print('Error in update election:', ex)
            return jsonify({'error': str(ex)}), 500

    @staticmethod
    def delete(election_id):
        try:
            from app.models.crypto_config import CryptoConfig
            from app.models.key_share import KeyShare
            from app.models.trusted_authority import TrustedAuthority
            election = Election.query.get(election_id)
            if not election:
                return jsonify({'error': 'Election not found'}), 404

            # Delete related CryptoConfig(s)
            crypto_configs = CryptoConfig.query.filter_by(election_id=election_id).all()
            for crypto in crypto_configs:
                # Delete related KeyShares
                key_shares = KeyShare.query.filter_by(crypto_id=crypto.crypto_id).all()
                for ks in key_shares:
                    ta = TrustedAuthority.query.get(ks.authority_id)
                    db.session.delete(ks)
                    # Only delete TA if it has no other key shares after this
                    db.session.flush()  # flush to update relationships
                    if ta and len(ta.key_shares) == 0:
                        db.session.delete(ta)
                db.session.delete(crypto)

            db.session.delete(election)
            db.session.commit()
            return jsonify({'message': 'Election and related cryptographic data deleted successfully'}), 200
        except Exception as ex:
            db.session.rollback()
            print('Error deleting election:', ex)
            return jsonify({'error': str(ex)}), 500

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