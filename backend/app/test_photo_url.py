from flask import Flask, jsonify, current_app, send_from_directory
import os

app = Flask(__name__)

# Set up the uploads folder path
UPLOADS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
app.config['UPLOADS_FOLDER'] = UPLOADS_FOLDER

@app.route('/api/test-photo-paths')
def test_photo_paths():
    """Test endpoint to check photo paths and directories"""
    uploads_dir = app.config['UPLOADS_FOLDER']
    photos_dir = os.path.join(uploads_dir, 'photos')
    
    # Check if directories exist
    uploads_exists = os.path.exists(uploads_dir)
    photos_exists = os.path.exists(photos_dir)
    
    # Get a list of files in both directories
    uploads_files = os.listdir(uploads_dir) if uploads_exists else []
    photos_files = os.listdir(photos_dir) if photos_exists else []
    
    # Filter out directories
    uploads_files = [f for f in uploads_files if os.path.isfile(os.path.join(uploads_dir, f))]
    photos_files = [f for f in photos_files if os.path.isfile(os.path.join(photos_dir, f))]
    
    # Generate example URLs for each file
    upload_urls = [f"/api/uploads/{f}" for f in uploads_files]
    photo_urls = [f"/api/uploads/{f}" for f in photos_files]
    
    return jsonify({
        'directories': {
            'uploads_dir': uploads_dir,
            'photos_dir': photos_dir,
            'uploads_exists': uploads_exists,
            'photos_exists': photos_exists,
        },
        'files': {
            'uploads_files': uploads_files,
            'photos_files': photos_files,
        },
        'urls': {
            'upload_urls': upload_urls,
            'photo_urls': photo_urls,
        }
    })

# Route to serve uploaded files
@app.route('/api/uploads/<path:filename>')
def serve_upload(filename):
    """Serve uploaded files like candidate photos."""
    # Get the configured uploads folder path
    uploads_dir = app.config['UPLOADS_FOLDER']
    
    # Check if the file exists directly in uploads folder first
    if os.path.exists(os.path.join(uploads_dir, filename)):
        return send_from_directory(uploads_dir, filename)
    
    # If not found, check in the photos subdirectory
    elif os.path.exists(os.path.join(uploads_dir, 'photos', filename)):
        return send_from_directory(os.path.join(uploads_dir, 'photos'), filename)
    
    # Finally try with the default path
    return send_from_directory(os.path.join('..', 'uploads'), filename)

if __name__ == '__main__':
    app.run(debug=True, port=5050)
