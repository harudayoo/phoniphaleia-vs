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
            return jsonify({"error": "Failed to delete position"}), 500    @staticmethod
    def get_positions_by_election(election_id):
        """Return positions for an election: if there are candidates, return their positions first (unique, in order of appearance), then all other positions for the org. Only include positions with the same org_id as the election."""
        from app.models.election import Election
        from app.models.candidate import Candidate
        try:
            # Get the election
            election = Election.query.get(election_id)
            if not election:
                return jsonify({"error": "Election not found"}), 404
            
            org_id = election.org_id
            
            # Get all positions for this org only
            org_positions = Position.query.filter_by(org_id=org_id).all()
            org_positions_dict = {p.position_id: p for p in org_positions}
            
            # Get all candidates for this election
            candidates = Candidate.query.filter_by(election_id=election_id).all()
            
            # Get unique position IDs from candidates in order of appearance
            candidate_position_ids = []
            seen = set()
            for c in candidates:
                if c.position_id not in seen and c.position_id in org_positions_dict:
                    candidate_position_ids.append(c.position_id)
                    seen.add(c.position_id)
            
            # Get positions for candidate positions (only those in the same org)
            candidate_positions = [org_positions_dict[pid] for pid in candidate_position_ids if pid in org_positions_dict]
            
            # Add org positions that are not already included in candidate positions
            extra_positions = [p for p in org_positions if p.position_id not in seen]
            
            # Combine: candidate positions first, then all other org positions
            all_positions = candidate_positions + extra_positions
            
            # Format output
            position_list = [{
                'id': p.position_id,
                'name': p.position_name,
                'organization_id': p.org_id,
                'description': p.description
            } for p in all_positions]
            
            return jsonify(position_list)
        except Exception as e:
            print(f"Error fetching positions by election: {str(e)}")
            return jsonify({"error": "Failed to fetch positions"}), 500