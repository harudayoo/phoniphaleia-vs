from flask import jsonify, request, current_app
from app.models.organization import Organization
from app import db
from datetime import datetime

class OrganizationController:
    @staticmethod
    def get_organizations():
        """Fetch all organizations from the database"""
        try:
            organizations = Organization.query.all()
            org_list = [{
                'id': org.org_id,
                'name': org.org_name,
                'college_id': org.college_id,
                'college_name': org.college.college_name if org.college else None,
                'description': org.org_desc,
                'created_at': org.created_at.isoformat() if org.created_at else None,
                'updated_at': org.updated_at.isoformat() if org.updated_at else None
            } for org in organizations]
            return jsonify(org_list)
        except Exception as e:
            print(f"Error fetching organizations: {str(e)}")
            return jsonify({"error": "Failed to fetch organizations"}), 500

