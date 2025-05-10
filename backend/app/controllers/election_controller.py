from app.models.election import Election
from app.models.organization import Organization
from app import db
from flask import jsonify

class ElectionController:
    @staticmethod
    def get_all():
        try:
            elections = Election.query.all()
            result = []
            for e in elections:
                # Make sure we return the date in a format the frontend can easily parse: YYYY-MM-DD
                result.append({
                    "election_id": e.election_id,
                    "election_name": e.election_name,
                    "election_desc": e.election_desc,
                    "election_status": e.election_status,
                    "date_end": e.date_end.isoformat() if e.date_end else None,
                    "organization": {
                        "org_name": e.organization.org_name if e.organization else None
                    }
                })
            return jsonify(result)
        except Exception as ex:
            print("Error in get_all elections:", ex)
            return jsonify({"error": str(ex)}), 500