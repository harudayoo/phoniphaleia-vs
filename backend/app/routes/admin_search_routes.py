from flask import Blueprint, request, jsonify
from app.models.admin import Admin

admin_search_bp = Blueprint('admin_search', __name__, url_prefix='/api')

@admin_search_bp.route('/admins/search', methods=['GET'])
def search_admins():
    query = request.args.get('query', '')
    admins = Admin.query.filter(
        (Admin.firstname.ilike(f'%{query}%')) |
        (Admin.lastname.ilike(f'%{query}%')) |
        (Admin.username.ilike(f'%{query}%'))
    ).all()
    return jsonify([
        {
            'id': admin.admin_id,
            'name': f"{admin.firstname} {admin.lastname}",
            'email': admin.email
        } for admin in admins
    ])
