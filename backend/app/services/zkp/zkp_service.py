import hashlib
import re

class ZKPService:
    """Service for handling Zero-Knowledge Proof authentication"""
    
    @staticmethod
    def verify_credentials(student_id, password_hash, stored_hash):
        """
        Verify the credentials using zero-knowledge proof concepts
        
        Args:
            student_id (str): The student ID
            password_hash (str): The hashed password from client
            stored_hash (str): The hash stored in database
            
        Returns:
            bool: True if credentials are valid, False otherwise
        """
        # In a real ZKP system, this would involve more complex verification
        # This is a simplified version for demonstration
        return stored_hash == password_hash
    
    @staticmethod
    def hash_password(password):
        """
        Create a secure hash of the password
        
        Args:
            password (str): The raw password
            
        Returns:
            str: SHA-256 hash of the password
        """
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def validate_student_id(student_id):
        """
        Validate the format of a student ID
        
        Args:
            student_id (str): The student ID to validate
            
        Returns:
            bool: True if valid format, False otherwise
        """
        pattern = r'^[0-9]{4}-[0-9]{5}$'
        return bool(re.match(pattern, student_id))