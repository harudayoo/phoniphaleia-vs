from flask import Blueprint, send_from_directory, current_app
import os

upload_bp = Blueprint('upload', __name__, url_prefix='/api')

@upload_bp.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    """Serve uploaded files like candidate photos."""
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads/photos')
    return send_from_directory(os.path.join('..', upload_folder), filename)
