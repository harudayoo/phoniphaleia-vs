# seed_colleges.py
from app import create_app, db
from app.models.college import College
from datetime import datetime

def seed_colleges():
    """
    Seed the colleges table with data retrieved from the database.
    This seeder file contains the actual data from the colleges table.
    """
    app = create_app()
    
    with app.app_context():
        # Check if colleges already exist
        if College.query.count() > 0:
            print("Colleges already exist in the database. Skipping seeding.")
            return
        
        # College data retrieved from the database
        colleges_data = [
            {
                'college_name': 'College of Information and Computing',
                'college_desc': 'The College of Information and Computing is committed towards the growth of Southern Philippines by developing information technology professionals, entrepreneurs, managers, and new technologies.',
                'created_at': datetime(2025, 4, 23, 4, 47, 51, 167612),
                'updated_at': datetime(2025, 5, 10, 22, 24, 16, 284089)
            },
            {
                'college_name': 'College of Arts and Sciences',
                'college_desc': 'College of Arts and Sciences is the service unit that takes charge of the two-year general education courses required in USeP undergraduate degree programs regardless of the field of specialization.',
                'created_at': datetime(2025, 4, 23, 4, 47, 51, 167612),
                'updated_at': datetime(2025, 4, 23, 4, 47, 51, 167612)
            },
            {
                'college_name': 'College of Education',
                'college_desc': 'The College of Education aims to be a leading institution in developing educational leaders and quality teachers in all levels imbued with knowledge, skills and attitude instrumental to economic, cultural, social, political and spiritual development of the country.',
                'created_at': datetime(2025, 4, 23, 4, 47, 51, 167612),
                'updated_at': datetime(2025, 4, 23, 4, 47, 51, 167612)
            },
            {
                'college_name': 'College of Engineering',
                'college_desc': 'The College of Engineering has built the reputation of having produced several engineering topnotchers, board passers, and technical professionals in the field of civil, electrical, electronics and communication, mechanical and plumbing engineering.',
                'created_at': datetime(2025, 4, 23, 4, 47, 51, 167612),
                'updated_at': datetime(2025, 4, 23, 4, 47, 51, 167612)
            },
            {
                'college_name': 'College of Technology',
                'college_desc': 'The College of Technology was established in 1983 with a mission to fulfill society\'s requirements, that is, to train and develop middle level manpower through technical education geared towards Philippine Industrialization.',
                'created_at': datetime(2025, 4, 23, 4, 47, 51, 167612),
                'updated_at': datetime(2025, 4, 23, 4, 47, 51, 167612)
            },
            {
                'college_name': 'College of Business Administration',
                'college_desc': 'The College of Business Administration delivers programs responsive to the dynamic business environment through its community of experts to produce highly-skilled and socially-responsible professionals.',
                'created_at': datetime(2025, 4, 23, 4, 47, 51, 167612),
                'updated_at': datetime(2025, 4, 23, 4, 47, 51, 167612)
            },
            {
                'college_name': 'College of Applied Economics',
                'college_desc': 'The College of Applied Economics is designed to create career opportunities in research, agriculture, consulting, banking, manufacturing, education and the public sector.',
                'created_at': datetime(2025, 4, 23, 4, 47, 51, 167612),
                'updated_at': datetime(2025, 4, 23, 4, 47, 51, 167612)
            }
        ]
        
        # Create and add college records
        colleges = []
        for college_data in colleges_data:
            college = College(
                college_name=college_data['college_name'],
                college_desc=college_data['college_desc'],
                created_at=college_data['created_at'],
                updated_at=college_data['updated_at']
            )
            colleges.append(college)
        
        # Add all colleges to the session
        db.session.add_all(colleges)
        
        try:
            # Commit the changes
            db.session.commit()
            print(f"Successfully seeded {len(colleges)} colleges into the database.")
        except Exception as e:
            db.session.rollback()
            print(f"Error seeding colleges: {str(e)}")
            raise

if __name__ == "__main__":
    seed_colleges()
