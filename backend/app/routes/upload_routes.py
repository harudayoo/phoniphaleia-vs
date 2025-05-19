from flask import Blueprint, send_from_directory, current_app
import os

upload_bp = Blueprint('upload', __name__, url_prefix='/api')

@upload_bp.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    """Serve uploaded files like candidate photos."""
    # Get the configured uploads folder path
    uploads_dir = current_app.config.get('UPLOADS_FOLDER')
    
    # Log the request for debugging
    print(f"Serving file: {filename}, looking in: {uploads_dir}")
    
    # Check if the file exists directly in uploads folder first
    if os.path.exists(os.path.join(uploads_dir, filename)):
        print(f"Found file in uploads_dir: {os.path.join(uploads_dir, filename)}")
        return send_from_directory(uploads_dir, filename)
    
    # If not found, check in the photos subdirectory
    photos_path = os.path.join(uploads_dir, 'photos')
    if os.path.exists(os.path.join(photos_path, filename)):
        print(f"Found file in photos_dir: {os.path.join(photos_path, filename)}")
        return send_from_directory(photos_path, filename)
    
    # If the filename contains a path separator, try to extract just the basename
    if os.sep in filename or '/' in filename:
        basename = os.path.basename(filename)
        # Check if just the basename exists in the photos directory
        if os.path.exists(os.path.join(photos_path, basename)):
            print(f"Found file (basename) in photos_dir: {os.path.join(photos_path, basename)}")
            return send_from_directory(photos_path, basename)
    
    # Finally try with the default path as a fallback
    fallback_path = os.path.join('..', 'uploads')
    print(f"Trying fallback path: {os.path.join(fallback_path, filename)}")
    return send_from_directory(fallback_path, filename)
