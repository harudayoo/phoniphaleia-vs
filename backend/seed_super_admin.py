#!/usr/bin/env python
# filepath: c:\Users\cayan\Documents\Development-Projects\phoniphaleia\backend\seed_super_admin.py
from app import create_app, db
from app.models.super_admin import SuperAdmin
from datetime import datetime

app = create_app()

def seed_super_admin():
    with app.app_context():
        # Check if there are already super admins in the database
        if SuperAdmin.query.count() == 0:
            print("Seeding database with super admin account...")
            
            # Create a super admin account with the provided details
            super_admin = SuperAdmin(
                email="hdscayan03454@usep.edu.ph",
                id_number="2021-03454",
                lastname="Admin",
                firstname="Super",
                middlename="Duper",
                username="SupahAdu"
            )
            
            # Set password using the setter method
            super_admin.password_raw = "SuperPassword2025"
            
            # Add to session and commit
            db.session.add(super_admin)
            db.session.commit()
            
            print(f"Super admin '{super_admin.username}' created successfully!")
        else:
            print("Super admin accounts already exist in the database. Skipping...")

if __name__ == "__main__":
    seed_super_admin()
