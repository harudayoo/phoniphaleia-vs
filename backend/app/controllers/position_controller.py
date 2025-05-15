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
                'college_name': position.organization.college.college_name if position.organization and position.organization.college else None,
                'description': position.description,
                'created_at': position.created_at.isoformat() if position.created_at else None,
                'updated_at': position.updated_at.isoformat() if position.updated_at else None
            } for position in positions]
            return jsonify(position_list)
        except Exception as e:
            print(f"Error fetching positions: {str(e)}")
            return jsonify({"error": "Failed to fetch positions"}), 500
    
    @staticmethod
    def create_position():
        """Create a new position"""
        try:
            data = request.json
            
            # Create new position
            new_position = Position(
                org_id=data['organization_id'],
                position_name=data['name'],
                description=data.get('description')  # Accept description if provided
            )
            
            db.session.add(new_position)
            db.session.commit()
            
            return jsonify({
                'id': new_position.position_id,
                'name': new_position.position_name,
                'organization_id': new_position.org_id,
                'organization_name': new_position.organization.org_name if new_position.organization else None,
                'description': new_position.description,  # Return description
                'created_at': new_position.created_at.isoformat() if new_position.created_at else None,
                'updated_at': new_position.updated_at.isoformat() if new_position.updated_at else None
            }), 201
        except Exception as e:
            db.session.rollback()
            print(f"Error creating position: {str(e)}")
            return jsonify({"error": "Failed to create position"}), 500
            
    @staticmethod
    def update_position(position_id):
        """Update an existing position"""
        try:
            data = request.json
            position = Position.query.get(position_id)
            
            if not position:
                return jsonify({"error": "Position not found"}), 404
                
            position.position_name = data.get('name', position.position_name)
            position.org_id = data.get('organization_id', position.org_id)
            position.description = data.get('description', position.description)
            
            db.session.commit()
            
            return jsonify({
                'id': position.position_id,
                'name': position.position_name,
                'organization_id': position.org_id,
                'organization_name': position.organization.org_name if position.organization else None,
                'description': position.description,
                'created_at': position.created_at.isoformat() if position.created_at else None,
                'updated_at': position.updated_at.isoformat() if position.updated_at else None
            })
        except Exception as e:
            db.session.rollback()
            print(f"Error updating position: {str(e)}")
            return jsonify({"error": "Failed to update position"}), 500
    
    @staticmethod
    def delete_position(position_id):
        """Delete a position"""
        try:
            position = Position.query.get(position_id)
            
            if not position:
                return jsonify({"error": "Position not found"}), 404
                
            db.session.delete(position)
            db.session.commit()
            
            return jsonify({"message": "Position deleted successfully"})
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting position: {str(e)}")
            return jsonify({"error": "Failed to delete position"}), 500