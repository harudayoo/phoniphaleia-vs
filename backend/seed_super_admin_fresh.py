# seed_super_admin_fresh.py
from app import create_app, db
from app.models.super_admin import SuperAdmin

def seed_super_admin_fresh(password="admin123"):
    """
    Seed the super_admin table with fresh data and a new password.
    This version is ideal for fresh database setups where you want to set a new password.
    
    Default credentials:
    - Username: SupahNi
    - Email: hdscayan03454@usep.edu.ph
    - ID Number: 2021-03454
    - Password: admin123 (can be customized)
    """
    app = create_app()
    
    with app.app_context():
        # Check if super admins already exist
        if SuperAdmin.query.count() > 0:
            print("Super admins already exist in the database. Skipping seeding.")
            return
        
        # Create super admin record with fresh timestamps
        super_admin = SuperAdmin(
            email='hdscayan03454@usep.edu.ph',
            id_number='2021-03454',
            lastname='Admin',
            firstname='Super',
            middlename='Duper',
            username='SupahNi'
        )
        
        # Set password using the property setter (will hash automatically)
        super_admin.password_raw = password
        
        # Add to session
        db.session.add(super_admin)
        
        try:
            # Commit the changes
            db.session.commit()
            print("Successfully seeded super admin into the database.")
            print(f"Username: {super_admin.username}")
            print(f"Email: {super_admin.email}")
            print(f"ID Number: {super_admin.id_number}")
            print(f"Password: {password}")
            print("Note: Password has been freshly hashed.")
        except Exception as e:
            db.session.rollback()
            print(f"Error seeding super admin: {str(e)}")
            raise

if __name__ == "__main__":
    # You can change the password here or pass it as argument
    import sys
    password = sys.argv[1] if len(sys.argv) > 1 else "admin123"
    seed_super_admin_fresh(password)
