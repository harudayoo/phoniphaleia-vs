from flask import Blueprint, request, jsonify
from app.models.documentation import Documentation
from app import db
from datetime import datetime
from sqlalchemy import or_

documentation_routes = Blueprint('documentation', __name__)

@documentation_routes.route('/api/documentation', methods=['GET'])
def get_all_documentation():
    """Get all documentation articles with optional filtering"""
    try:
        # Get query parameters
        status = request.args.get('status')
        category = request.args.get('category')
        search = request.args.get('search')
        sort = request.args.get('sort', 'date_desc')

        # Start with base query
        query = Documentation.query

        # Apply filters
        if status and status != 'ALL':
            query = query.filter(Documentation.status == status)
        
        if category and category != 'ALL':
            query = query.filter(Documentation.category == category)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(or_(
                Documentation.title.ilike(search_term),
                Documentation.description.ilike(search_term),
                Documentation.author.ilike(search_term)
            ))
        
        # Apply sorting
        if sort == 'date_asc':
            query = query.order_by(Documentation.published_at.asc())
        elif sort == 'date_desc':
            query = query.order_by(Documentation.published_at.desc())
        elif sort == 'title_asc':
            query = query.order_by(Documentation.title.asc())
        elif sort == 'title_desc':
            query = query.order_by(Documentation.title.desc())
        elif sort == 'category':
            query = query.order_by(Documentation.category.asc())
        
        # Execute query and convert to list of dictionaries
        docs = [doc.to_dict() for doc in query.all()]
        
        return jsonify({'status': 'success', 'data': docs})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@documentation_routes.route('/api/documentation/<int:doc_id>', methods=['GET'])
def get_documentation(doc_id):
    """Get a specific documentation article by ID"""
    try:
        doc = Documentation.query.get(doc_id)
        if not doc:
            return jsonify({'status': 'error', 'message': 'Documentation not found'}), 404
        
        return jsonify({'status': 'success', 'data': doc.to_dict()})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@documentation_routes.route('/api/documentation', methods=['POST'])
def create_documentation():
    """Create a new documentation article"""
    try:
        data = request.json
        
        # Set published_at date for published documents
        published_at = None
        if data.get('status') == 'Published':
            published_at = datetime.utcnow()
        
        new_doc = Documentation(
            title=data.get('title'),
            category=data.get('category'),
            status=data.get('status'),
            description=data.get('description'),
            content=data.get('content'),
            author=data.get('author'),
            published_at=published_at
        )
        
        db.session.add(new_doc)
        db.session.commit()
        
        return jsonify({
            'status': 'success', 
            'message': 'Documentation created successfully',
            'data': new_doc.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500

@documentation_routes.route('/api/documentation/<int:doc_id>', methods=['PUT'])
def update_documentation(doc_id):
    """Update an existing documentation article"""
    try:
        doc = Documentation.query.get(doc_id)
        if not doc:
            return jsonify({'status': 'error', 'message': 'Documentation not found'}), 404
        
        data = request.json
        
        # Update published_at if status is changing to Published
        if data.get('status') == 'Published' and doc.status != 'Published':
            doc.published_at = datetime.utcnow()
        
        # Update fields
        doc.title = data.get('title', doc.title)
        doc.category = data.get('category', doc.category)
        doc.status = data.get('status', doc.status)
        doc.description = data.get('description', doc.description)
        doc.content = data.get('content', doc.content)
        doc.author = data.get('author', doc.author)
        
        db.session.commit()
        
        return jsonify({
            'status': 'success', 
            'message': 'Documentation updated successfully',
            'data': doc.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500

@documentation_routes.route('/api/documentation/<int:doc_id>', methods=['DELETE'])
def delete_documentation(doc_id):
    """Delete a documentation article"""
    try:
        doc = Documentation.query.get(doc_id)
        if not doc:
            return jsonify({'status': 'error', 'message': 'Documentation not found'}), 404
        
        db.session.delete(doc)
        db.session.commit()
        
        return jsonify({
            'status': 'success', 
            'message': 'Documentation deleted successfully'
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
