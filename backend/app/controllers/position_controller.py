from flask import jsonify, request, current_app
import jwt
from app.models.position import Position
from app import db
from datetime import datetime

class PositionController:
    @staticmethod
    def get_positions():
        """Fetch all positions from the database"""
        try:
            positions = Position.query.all()
            position_list = [{
                'id': position.position_id,
                'name': position.position_name,
                'organization_id': position.org_id,
                'organization_name': position.organization.org_name if position.organization else None,
                'max_candidates': 3,  # Add this field to your Position model if needed
                'description': position.description,
                'created_at': position.created_at.isoformat() if position.created_at else None,
                'updated_at': position.updated_at.isoformat() if position.updated_at else None
            } for position in positions]
            return jsonify(position_list)
        except Exception as e:
            print(f"Error fetching positions: {str(e)}")
            return jsonify({"error": "Failed to fetch positions"}), 500