from app.models.election import Election
from app.models.organization import Organization
from app import db
from flask import jsonify, request

class ElectionController:
    @staticmethod
    def get_all():
        try:
            elections = Election.query.all()
            result = []
            for e in elections:
                result.append({
                    "election_id": e.election_id,
                    "election_name": e.election_name,
                    "election_desc": e.election_desc,
                    "election_status": e.election_status,
                    "date_start": e.date_start.isoformat() if e.date_start else None,
                    "date_end": e.date_end.isoformat() if e.date_end else None,
                    "organization": {
                        "org_name": e.organization.org_name if e.organization else None
                    },
                    "voters_count": e.voters_count if hasattr(e, "voters_count") else 0,
                    "participation_rate": e.participation_rate if hasattr(e, "participation_rate") else None
                })
            return jsonify(result)
        except Exception as ex:
            print("Error in get_all elections:", ex)
            return jsonify({"error": str(ex)}), 500

    @staticmethod
    def create():
        try:
            data = request.json
            election = Election(
                org_id=data['org_id'],
                election_name=data['election_name'],
                election_desc=data.get('election_desc'),
                election_status=data.get('election_status', 'Upcoming'),
                date_start=data.get('date_start'),
                date_end=data['date_end'],
            )
            db.session.add(election)
            db.session.commit()
            return jsonify({
                'election_id': election.election_id,
                'election_name': election.election_name
            }), 201
        except Exception as ex:
            db.session.rollback()
            print("Error in create election:", ex)
            return jsonify({"error": str(ex)}), 500