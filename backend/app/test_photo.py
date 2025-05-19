from flask import Flask, jsonify, send_from_directory
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
    
    # List files in both directories
    uploads_files = os.listdir(uploads_dir) if uploads_exists else []
    photos_files = os.listdir(photos_dir) if photos_exists else []
    
    # Get full paths for the first photo file (if any)
    sample_photo_path = None
    if photos_files:
        sample_photo_path = os.path.join(photos_dir, photos_files[0])
        sample_photo_exists = os.path.exists(sample_photo_path)
    else:
        sample_photo_exists = False
    
    # Construct the expected URL for the first photo
    sample_photo_url = None
    if photos_files:
        # Using the new convention: "/api/uploads/photos/filename.jpg"
        sample_photo_url = f"/api/uploads/{photos_files[0]}"
        
    return jsonify({
        'uploads_dir': uploads_dir,
        'photos_dir': photos_dir,
        'uploads_exists': uploads_exists,
        'photos_exists': photos_exists,
        'uploads_files': uploads_files,
        'photos_files': photos_files,
        'sample_photo_path': sample_photo_path,
        'sample_photo_exists': sample_photo_exists,
        'sample_photo_url': sample_photo_url,
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
