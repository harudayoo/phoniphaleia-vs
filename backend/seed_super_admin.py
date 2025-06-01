#!/usr/bin/env python
# filepath: c:\Users\cayan\Documents\Development-Projects\phoniphaleia\backend\seed_super_admin.py
from app import create_app, db
from app.models.super_admin import SuperAdmin
from datetime import datetime

def seed_super_admin(password="admin123", use_database_username=True):
    """
    Seed the super_admin table with admin account.
    
    Args:
        password: The password to set for the admin account
        use_database_username: If True, uses 'SupahNi' (from database), 
                              if False, uses 'SupahAdu' (original seeder)
    
    Default credentials based on actual database data:
    - Username: SupahNi (or SupahAdu if use_database_username=False)
    - Email: hdscayan03454@usep.edu.ph
    - ID Number: 2021-03454
    - Password: admin123 (customizable)
    """
    app = create_app()
    
    with app.app_context():
        # Check if there are already super admins in the database
        if SuperAdmin.query.count() == 0:
            print("Seeding database with super admin account...")
            
            # Use the username from database or keep original
            username = "SupahNi" if use_database_username else "SupahAdu"
            
            # Create a super admin account with the provided details
            super_admin = SuperAdmin(
                email="hdscayan03454@usep.edu.ph",
                id_number="2021-03454",
                lastname="Admin",
                firstname="Super",
                middlename="Duper",
                username=username
            )
            
            # Set password using the setter method
            super_admin.password_raw = password
            
            # Add to session and commit
            db.session.add(super_admin)
            db.session.commit()
            
            print(f"Super admin '{super_admin.username}' created successfully!")
            print(f"Email: {super_admin.email}")
            print(f"ID Number: {super_admin.id_number}")
            print(f"Password: {password}")
        else:
            print("Super admin accounts already exist in the database. Skipping...")

if __name__ == "__main__":
    import sys
    
    # Parse command line arguments
    password = "admin123"
    use_db_username = True
    
    if len(sys.argv) > 1:
        password = sys.argv[1]
    if len(sys.argv) > 2:
        use_db_username = sys.argv[2].lower() in ['true', '1', 'yes']
    
    seed_super_admin(password, use_db_username)
