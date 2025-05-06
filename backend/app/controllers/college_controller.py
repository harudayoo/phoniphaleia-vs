from flask import jsonify
from app.models.college import College
from app import db

class CollegeController:
    @staticmethod
    def get_colleges():
        """Fetch all colleges from the database"""
        try:
            colleges = College.query.all()
            college_list = [{
                'college_id': college.college_id,
                'name': college.college_name
            } for college in colleges]
            return jsonify(college_list)
        except Exception as e:
            # Log the error
            print(f"Error fetching colleges: {str(e)}")
            return jsonify({"error": "Failed to fetch colleges"}), 500