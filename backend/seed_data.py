from app import create_app, db
from app.models.admin import Admin
from app.models.election import Election
from app.models.voter import Voter
from app.models.vote import Vote
from app.models.college import College
from app.models.organization import Organization
from app.models.position import Position
from app.models.candidate import Candidate
from datetime import datetime, timedelta
import random

app = create_app()

def seed_data():
    with app.app_context():
        # Only run if the database is empty
        if Admin.query.count() == 0:
            print("Seeding database with initial data...")
            
            # Create a test admin
            test_admin = Admin(
                email="admin@example.com",
                id_number="1234-56789",  # Matches the required format
                lastname="Admin",
                firstname="Test",
                username="admin",
                password="$2b$12$vI18R3eeGBRlnijvIuPxhOIXeWWU.hYy/AhrS9PvIltqZfSY19Cqu"  # 'password'
            )
            db.session.add(test_admin)
            
            # Create colleges
            colleges = [
                College(college_name="College of Engineering", college_abbrev="COE"),
                College(college_name="College of Science", college_abbrev="COS"),
                College(college_name="College of Business", college_abbrev="COB"),
                College(college_name="College of Arts", college_abbrev="COA")
            ]
            db.session.add_all(colleges)
            db.session.commit()
            
            # Create organizations
            orgs = [
                Organization(org_name="Student Council", org_desc="Main student governing body"),
                Organization(org_name="Engineering Society", org_desc="For engineering students"),
                Organization(org_name="Business Club", org_desc="For business students"),
                Organization(org_name="Arts Association", org_desc="For arts students")
            ]
            db.session.add_all(orgs)
            db.session.commit()
            
            # Create positions
            positions = [
                Position(position_name="President", org_id=1),
                Position(position_name="Vice President", org_id=1),
                Position(position_name="Secretary", org_id=1),
                Position(position_name="Treasurer", org_id=1),
                Position(position_name="President", org_id=2),
                Position(position_name="Secretary", org_id=2),
                Position(position_name="President", org_id=3),
                Position(position_name="Chairperson", org_id=4)
            ]
            db.session.add_all(positions)
            db.session.commit()
            
            # Create elections
            current_date = datetime.now()
            elections = [
                # Active/ongoing elections
                Election(
                    org_id=1,
                    election_name="Student Council Election 2025",
                    election_desc="Annual election for the student council",
                    election_status="active",
                    date_start=(current_date - timedelta(days=2)).date(),
                    date_end=(current_date + timedelta(days=5)).date(),
                    voters_count=500
                ),
                Election(
                    org_id=2,
                    election_name="Engineering Society Election",
                    election_desc="Annual election for the engineering society",
                    election_status="active",
                    date_start=(current_date - timedelta(days=1)).date(),
                    date_end=(current_date + timedelta(days=3)).date(),
                    voters_count=300
                ),
                
                # Completed elections
                Election(
                    org_id=3,
                    election_name="Business Club Election 2024",
                    election_desc="Annual election for the business club",
                    election_status="completed",
                    date_start=(current_date - timedelta(days=30)).date(),
                    date_end=(current_date - timedelta(days=25)).date(),
                    voters_count=200,
                    participation_rate=85.5
                ),
                Election(
                    org_id=4,
                    election_name="Arts Association Election 2024",
                    election_desc="Annual election for the arts association",
                    election_status="completed",
                    date_start=(current_date - timedelta(days=45)).date(),
                    date_end=(current_date - timedelta(days=40)).date(),
                    voters_count=150,
                    participation_rate=78.2
                ),
                
                # Scheduled elections
                Election(
                    org_id=1,
                    election_name="Student Council Special Election",
                    election_desc="Special election for vacant positions",
                    election_status="scheduled",
                    date_start=(current_date + timedelta(days=15)).date(),
                    date_end=(current_date + timedelta(days=18)).date(),
                    voters_count=500
                )
            ]
            db.session.add_all(elections)
            db.session.commit()
            
            # Create candidates for each position in each election
            candidates = []
            for election in elections:
                positions_for_org = Position.query.filter_by(org_id=election.org_id).all()
                for position in positions_for_org:
                    for i in range(1, 4):  # 3 candidates per position
                        candidates.append(
                            Candidate(
                                student_id=f"{election.org_id}{position.position_id}{i}",
                                election_id=election.election_id,
                                position_id=position.position_id,
                                candidate_name=f"Candidate {i} for {position.position_name}",
                                candidate_info=f"Info about candidate {i}",
                                vote_count=0
                            )
                        )
            db.session.add_all(candidates)
            db.session.commit()
            
            # Create voters
            voters = []
            student_id_counter = 10000
            for college in colleges:
                for i in range(150):  # 150 voters per college
                    student_id_counter += 1
                    voters.append(
                        Voter(
                            student_id=str(student_id_counter),
                            student_email=f"student{student_id_counter}@example.com",
                            college_id=college.college_id,
                            lastname=f"Last{student_id_counter}",
                            firstname=f"First{student_id_counter}",
                            middle_initial="X",
                            password="$2b$12$vI18R3eeGBRlnijvIuPxhOIXeWWU.hYy/AhrS9PvIltqZfSY19Cqu",  # 'password'
                            vote_status="unverified"
                        )
                    )
            db.session.add_all(voters)
            db.session.commit()
            
            # Create votes for completed elections
            votes = []
            # For Business Club Election (ID 3)
            business_election = elections[2]  # 0-indexed, so index 2 is the 3rd election
            business_candidates = Candidate.query.filter_by(election_id=business_election.election_id).all()
            voter_count = 0
            for voter in Voter.query.limit(int(business_election.voters_count * (business_election.participation_rate / 100))).all():
                voter_count += 1
                # Assign a random candidate for each voter
                random_candidate = random.choice(business_candidates)
                votes.append(
                    Vote(
                        election_id=business_election.election_id,
                        student_id=voter.student_id,
                        candidate_id=random_candidate.candidate_id,
                        encrypted_vote="encrypted_vote_data",
                        zkp_proof="verified",
                        verification_receipt="sent",
                        cast_time=datetime.utcnow() - timedelta(days=random.randint(25, 30)),
                        vote_status="verified"
                    )
                )
                
            # For Arts Association Election (ID 4)
            arts_election = elections[3]  # 0-indexed, so index 3 is the 4th election
            arts_candidates = Candidate.query.filter_by(election_id=arts_election.election_id).all()
            voter_count = 0
            for voter in Voter.query.offset(200).limit(int(arts_election.voters_count * (arts_election.participation_rate / 100))).all():
                voter_count += 1
                # Assign a random candidate for each voter
                random_candidate = random.choice(arts_candidates)
                votes.append(
                    Vote(
                        election_id=arts_election.election_id,
                        student_id=voter.student_id,
                        candidate_id=random_candidate.candidate_id,
                        encrypted_vote="encrypted_vote_data",
                        zkp_proof="verified",
                        verification_receipt="sent",
                        cast_time=datetime.utcnow() - timedelta(days=random.randint(40, 45)),
                        vote_status="verified"
                    )
                )
                
            db.session.add_all(votes)
            db.session.commit()
            
            print("Database seeded successfully!")
        else:
            print("Database already contains data. Skipping seed operation.")

if __name__ == "__main__":
    seed_data()
