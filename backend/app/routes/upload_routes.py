from flask import Blueprint, send_from_directory, current_app, abort
import os

upload_bp = Blueprint('upload', __name__, url_prefix='/api')

@upload_bp.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    """Serve uploaded files like candidate photos."""
    # Get the configured uploads folder path
    uploads_dir = current_app.config.get('UPLOADS_FOLDER')
    
    # Log the request for debugging
    print(f"Serving file: {filename}, looking in: {uploads_dir}")
    print(f"Full uploads_dir path: {os.path.abspath(uploads_dir) if uploads_dir else 'None'}")
    
    if not uploads_dir or not os.path.exists(uploads_dir):
        print(f"Uploads directory not found: {uploads_dir}")
        abort(404)
    
    # Handle photos/ prefix in filename
    if filename.startswith('photos/'):
        # Remove the 'photos/' prefix and look directly in photos subdirectory
        actual_filename = filename[7:]  # Remove 'photos/' prefix
        photos_path = os.path.join(uploads_dir, 'photos')
        full_file_path = os.path.join(photos_path, actual_filename)
        print(f"Looking for photos file: {actual_filename} in {photos_path}")
        print(f"Full file path: {full_file_path}")
        print(f"File exists: {os.path.exists(full_file_path)}")
        
        if os.path.exists(full_file_path):
            print(f"Found file in photos subdirectory: {full_file_path}")
            return send_from_directory(photos_path, actual_filename)
    
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
    
    # List files in uploads directory for debugging
    print(f"Files in uploads_dir: {os.listdir(uploads_dir) if uploads_dir and os.path.exists(uploads_dir) else 'Directory not found'}")
    if os.path.exists(photos_path):
        print(f"Files in photos_dir: {os.listdir(photos_path)}")
    else:
        print(f"Photos directory does not exist: {photos_path}")
    
    # File not found - return 404
    print(f"File not found: {filename}")
    abort(404)
