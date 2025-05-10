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
    
    @staticmethod
    def create_organization():
        """Create a new organization"""
        try:
            data = request.json
            
            # Create new organization
            new_org = Organization(
                college_id=data.get('college_id'),
                org_name=data['name'],
                org_desc=data.get('description')
            )
            
            db.session.add(new_org)
            db.session.commit()
            
            return jsonify({
                'id': new_org.org_id,
                'name': new_org.org_name,
                'college_id': new_org.college_id,
                'college_name': new_org.college.college_name if new_org.college else None,
                'description': new_org.org_desc,
                'created_at': new_org.created_at.isoformat() if new_org.created_at else None,
                'updated_at': new_org.updated_at.isoformat() if new_org.updated_at else None
            }), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating organization: {str(e)}")
            return jsonify({"error": "Failed to create organization"}), 500
            
    @staticmethod
    def update_organization(org_id):
        """Update an existing organization"""
        try:
            data = request.json
            org = Organization.query.get(org_id)
            
            if not org:
                return jsonify({"error": "Organization not found"}), 404
                
            org.org_name = data.get('name', org.org_name)
            org.college_id = data.get('college_id', org.college_id)
            org.org_desc = data.get('description', org.org_desc)
            
            db.session.commit()
            
            return jsonify({
                'id': org.org_id,
                'name': org.org_name,
                'college_id': org.college_id,
                'college_name': org.college.college_name if org.college else None,
                'description': org.org_desc,
                'created_at': org.created_at.isoformat() if org.created_at else None,
                'updated_at': org.updated_at.isoformat() if org.updated_at else None
            })
        except Exception as e:
            db.session.rollback()
            print(f"Error updating organization: {str(e)}")
            return jsonify({"error": "Failed to update organization"}), 500
    
    @staticmethod
    def delete_organization(org_id):
        """Delete an organization"""
        try:
            org = Organization.query.get(org_id)
            
            if not org:
                return jsonify({"error": "Organization not found"}), 404
                
            db.session.delete(org)
            db.session.commit()
            
            return jsonify({"message": "Organization deleted successfully"})
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting organization: {str(e)}")
            return jsonify({"error": "Failed to delete organization"}), 500

