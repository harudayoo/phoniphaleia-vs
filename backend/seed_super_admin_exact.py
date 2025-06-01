# seed_super_admin.py
from app import create_app, db
from app.models.super_admin import SuperAdmin
from datetime import datetime
import pytz

def seed_super_admin():
    """
    Seed the super_admin table with data retrieved from the database.
    This seeder file contains the actual data from the super_admin table.
    
    Note: This includes the actual hashed password from the database.
    Default credentials based on the data:
    - Username: SupahNi
    - Email: hdscayan03454@usep.edu.ph
    - ID Number: 2021-03454
    """
    app = create_app()
    
    with app.app_context():
        # Check if super admins already exist
        if SuperAdmin.query.count() > 0:
            print("Super admins already exist in the database. Skipping seeding.")
            return
        
        # Create timezone-aware datetime objects
        # The original timestamps appear to be in Philippine Time (UTC+8)
        ph_tz = pytz.timezone('Asia/Manila')
        
        # Super admin data retrieved from the database
        super_admin_data = {
            'email': 'hdscayan03454@usep.edu.ph',
            'id_number': '2021-03454',
            'lastname': 'Admin',
            'firstname': 'Super',
            'middlename': 'Duper',
            'username': 'SupahNi',
            'password': '$2b$12$6txqvNHlXDeCPCux3HQY0.pwsXOtARN1UCDiiWRE2KlhIEW0Iiice',  # This is the actual hashed password
            'created_at': datetime(2025, 5, 25, 23, 39, 25, 832886, tzinfo=ph_tz),
            'updated_at': datetime(2025, 5, 26, 18, 22, 6, 801774, tzinfo=ph_tz),
            'verified_at': None,
            'otp_code': None,
            'otp_expires_at': None,
            'last_login': datetime(2025, 5, 26, 10, 22, 6, 803548, tzinfo=ph_tz)
        }
        
        # Create super admin record directly (bypassing password property setter)
        super_admin = SuperAdmin(
            email=super_admin_data['email'],
            id_number=super_admin_data['id_number'],
            lastname=super_admin_data['lastname'],
            firstname=super_admin_data['firstname'],
            middlename=super_admin_data['middlename'],
            username=super_admin_data['username'],
            created_at=super_admin_data['created_at'],
            updated_at=super_admin_data['updated_at'],
            verified_at=super_admin_data['verified_at'],
            otp_code=super_admin_data['otp_code'],
            otp_expires_at=super_admin_data['otp_expires_at'],
            last_login=super_admin_data['last_login']
        )
        
        # Set the password directly (already hashed)
        super_admin.password = super_admin_data['password']
        
        # Add to session
        db.session.add(super_admin)
        
        try:
            # Commit the changes
            db.session.commit()
            print("Successfully seeded super admin into the database.")
            print(f"Username: {super_admin.username}")
            print(f"Email: {super_admin.email}")
            print(f"ID Number: {super_admin.id_number}")
            print("Note: The password hash has been preserved from the original database.")
        except Exception as e:
            db.session.rollback()
            print(f"Error seeding super admin: {str(e)}")
            raise

if __name__ == "__main__":
    seed_super_admin()
