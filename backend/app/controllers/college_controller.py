from flask import jsonify, request
from app.models.college import College
from app import db
from datetime import datetime

class CollegeController:
    @staticmethod
    def get_colleges():
        """Fetch all colleges from the database"""
        try:
            colleges = College.query.all()
            college_list = [{
                'college_id': college.college_id,
                'college_name': college.college_name,
                'college_desc': college.college_desc,
                'created_at': college.created_at.isoformat() if college.created_at else None,
                'updated_at': college.updated_at.isoformat() if college.updated_at else None
            } for college in colleges]
            return jsonify(college_list)
        except Exception as e:
            print(f"Error fetching colleges: {str(e)}")
            return jsonify({"error": "Failed to fetch colleges"}), 500
    
    @staticmethod
    def get_college(college_id):
        """Fetch a specific college by ID"""
        try:
            college = College.query.get(college_id)
            if not college:
                return jsonify({"error": "College not found"}), 404
                
            return jsonify({
                'college_id': college.college_id,
                'college_name': college.college_name,
                'college_desc': college.college_desc,
                'created_at': college.created_at.isoformat() if college.created_at else None,
                'updated_at': college.updated_at.isoformat() if college.updated_at else None
            })
        except Exception as e:
            print(f"Error fetching college: {str(e)}")
            return jsonify({"error": "Failed to fetch college"}), 500
    
    @staticmethod
    def create_college():
        """Create a new college"""
        try:
            data = request.get_json()
            
            if not data or 'college_name' not in data:
                return jsonify({"error": "College name is required"}), 400
                
            college = College(
                college_name=data['college_name'],
                college_desc=data.get('college_desc')
            )
            
            db.session.add(college)
            db.session.commit()
            
            return jsonify({
                'college_id': college.college_id,
                'college_name': college.college_name,
                'college_desc': college.college_desc,
                'created_at': college.created_at.isoformat() if college.created_at else None,
                'updated_at': college.updated_at.isoformat() if college.updated_at else None
            }), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating college: {str(e)}")
            return jsonify({"error": "Failed to create college"}), 500
    
    @staticmethod
    def update_college(college_id):
        """Update an existing college"""
        try:
            college = College.query.get(college_id)
            if not college:
                return jsonify({"error": "College not found"}), 404
                
            data = request.get_json()
            
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            if 'college_name' in data:
                college.college_name = data['college_name']
            if 'college_desc' in data:
                college.college_desc = data['college_desc']
            
            college.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'college_id': college.college_id,
                'college_name': college.college_name,
                'college_desc': college.college_desc,
                'created_at': college.created_at.isoformat() if college.created_at else None,
                'updated_at': college.updated_at.isoformat() if college.updated_at else None
            })
        except Exception as e:
            db.session.rollback()
            print(f"Error updating college: {str(e)}")
            return jsonify({"error": "Failed to update college"}), 500
    
    @staticmethod
    def delete_college(college_id):
        """Delete a college"""
        try:
            college = College.query.get(college_id)
            if not college:
                return jsonify({"error": "College not found"}), 404
                
            db.session.delete(college)
            db.session.commit()
            
            return jsonify({"message": "College deleted successfully"})
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting college: {str(e)}")
            return jsonify({"error": "Failed to delete college"}), 500