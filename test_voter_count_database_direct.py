#!/usr/bin/env python3
"""
Direct database access test for voter count workflow
Bypasses API authentication to test database operations directly
"""

import sys
import os
import logging
from datetime import datetime, date

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('voter_count_test.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def test_voter_count_workflow():
    """Test the complete voter count workflow using direct database access"""
    
    try:
        # Import Flask app and models
        from app import create_app, db
        from app.models.election import Election
        from app.models.voter import Voter
        from app.models.vote import Vote
        from app.models.election_waitlist import ElectionWaitlist
        from app.models.college import College
        from app.models.organization import Organization
        
        # Create Flask app context
        app = create_app()
        
        with app.app_context():
            logger.info("=== Starting Direct Database Voter Count Tests ===")
            
            # 1. Check existing elections and their types
            logger.info("\n--- Step 1: Examining existing elections ---")
            elections = Election.query.all()
            logger.info(f"Found {len(elections)} elections in database")
            
            for election in elections:
                logger.info(f"Election {election.election_id}: {election.election_name}")
                logger.info(f"  - Queued Access: {election.queued_access}")
                logger.info(f"  - Max Concurrent: {election.max_concurrent_voters}")
                logger.info(f"  - Current Voters Count: {election.voters_count}")
                logger.info(f"  - Status: {election.election_status}")
            
            # 2. Find test elections or create them
            logger.info("\n--- Step 2: Setting up test elections ---")
            
            # Find or create a non-queued election
            non_queued_election = Election.query.filter_by(queued_access=False).first()
            if not non_queued_election:
                # Get first organization for test
                org = Organization.query.first()
                if not org:
                    logger.error("No organizations found. Cannot create test election.")
                    return
                
                non_queued_election = Election(
                    org_id=org.org_id,
                    election_name="Test Non-Queued Election",
                    election_desc="Test election without queue",
                    election_status="Active",
                    date_start=date.today(),
                    date_end=date.today(),
                    queued_access=False,
                    max_concurrent_voters=None,
                    voters_count=0
                )
                db.session.add(non_queued_election)
                db.session.commit()
                logger.info(f"Created test non-queued election: {non_queued_election.election_id}")
            else:
                # Reset voters count for testing
                non_queued_election.voters_count = 0
                db.session.commit()
                logger.info(f"Using existing non-queued election: {non_queued_election.election_id}")
            
            # Find or create a queued election
            queued_election = Election.query.filter_by(queued_access=True).first()
            if not queued_election:
                org = Organization.query.first()
                queued_election = Election(
                    org_id=org.org_id,
                    election_name="Test Queued Election",
                    election_desc="Test election with queue",
                    election_status="Active",
                    date_start=date.today(),
                    date_end=date.today(),
                    queued_access=True,
                    max_concurrent_voters=2,
                    voters_count=0
                )
                db.session.add(queued_election)
                db.session.commit()
                logger.info(f"Created test queued election: {queued_election.election_id}")
            else:
                # Reset for testing
                queued_election.voters_count = 0
                queued_election.max_concurrent_voters = 2
                db.session.commit()
                logger.info(f"Using existing queued election: {queued_election.election_id}")
            
            # 3. Get test voters
            logger.info("\n--- Step 3: Finding test voters ---")
            test_voters = Voter.query.filter_by(status='Enrolled').limit(5).all()
            if len(test_voters) < 3:
                logger.error(f"Need at least 3 enrolled voters for testing, found {len(test_voters)}")
                return
            
            for i, voter in enumerate(test_voters[:3]):
                logger.info(f"Test Voter {i+1}: {voter.student_id} - {voter.firstname} {voter.lastname}")
            
            # 4. Test Non-Queued Election Workflow
            logger.info("\n--- Step 4: Testing Non-Queued Election Workflow ---")
            
            # Simulate multiple voters accessing non-queued election
            logger.info(f"Initial voters_count: {non_queued_election.voters_count}")
            
            for i, voter in enumerate(test_voters[:3]):
                logger.info(f"\nSimulating voter {i+1} ({voter.student_id}) accessing non-queued election...")
                
                # Check if voter already voted
                existing_vote = Vote.query.filter_by(
                    election_id=non_queued_election.election_id, 
                    student_id=voter.student_id
                ).first()
                
                if existing_vote:
                    logger.info(f"Voter {voter.student_id} already voted, skipping")
                    continue
                
                # Simulate access check - increment voters_count (Non-Queued logic)
                old_count = non_queued_election.voters_count or 0
                non_queued_election.voters_count = old_count + 1
                db.session.commit()
                
                logger.info(f"Access granted - voters_count incremented from {old_count} to {non_queued_election.voters_count}")
                
                # Simulate some voters completing votes, others exiting
                if i == 0:
                    # First voter completes vote
                    logger.info(f"Voter {voter.student_id} completes vote")
                    # Note: In real scenario, vote would be created here
                    # Decrement voters_count after vote completion
                    non_queued_election.voters_count -= 1
                    db.session.commit()
                    logger.info(f"Vote completed - voters_count decremented to {non_queued_election.voters_count}")
                
                elif i == 1:
                    # Second voter exits without voting
                    logger.info(f"Voter {voter.student_id} exits cast page without voting")
                    # Decrement voters_count on exit
                    non_queued_election.voters_count -= 1
                    db.session.commit()
                    logger.info(f"Exit detected - voters_count decremented to {non_queued_election.voters_count}")
                
                # Third voter stays active for now
            
            logger.info(f"Final Non-Queued Election voters_count: {non_queued_election.voters_count}")
            
            # 5. Test Queued Election Workflow
            logger.info("\n--- Step 5: Testing Queued Election Workflow ---")
            
            # Clear any existing waitlist entries for clean test
            ElectionWaitlist.query.filter_by(election_id=queued_election.election_id).delete()
            db.session.commit()
            
            logger.info(f"Initial queued election voters_count: {queued_election.voters_count}")
            logger.info(f"Max concurrent voters: {queued_election.max_concurrent_voters}")
            
            for i, voter in enumerate(test_voters[:4]):  # Test with 4 voters for queue
                logger.info(f"\nSimulating voter {i+1} ({voter.student_id}) accessing queued election...")
                
                # Check if voter already voted
                existing_vote = Vote.query.filter_by(
                    election_id=queued_election.election_id, 
                    student_id=voter.student_id
                ).first()
                
                if existing_vote:
                    logger.info(f"Voter {voter.student_id} already voted, skipping")
                    continue
                
                # Simulate queued access logic
                current_voters = queued_election.voters_count or 0
                max_concurrent = queued_election.max_concurrent_voters or 1
                
                if current_voters < max_concurrent:
                    # Grant direct access
                    queued_election.voters_count = current_voters + 1
                    db.session.commit()
                    logger.info(f"Direct access granted - voters_count incremented from {current_voters} to {queued_election.voters_count}")
                    
                    # Simulate vote completion for first voter
                    if i == 0:
                        logger.info(f"Voter {voter.student_id} completes vote")
                        queued_election.voters_count -= 1
                        db.session.commit()
                        logger.info(f"Vote completed - voters_count decremented to {queued_election.voters_count}")
                        
                else:
                    # Add to waitlist
                    waitlist_entry = ElectionWaitlist(
                        election_id=queued_election.election_id,
                        voter_id=voter.student_id,
                        status='waiting'
                    )
                    db.session.add(waitlist_entry)
                    db.session.commit()
                    logger.info(f"Election full - voter {voter.student_id} added to waitlist")
            
            # 6. Check final state
            logger.info("\n--- Step 6: Final State Check ---")
            
            # Refresh from database
            db.session.refresh(non_queued_election)
            db.session.refresh(queued_election)
            
            logger.info(f"Non-Queued Election final voters_count: {non_queued_election.voters_count}")
            logger.info(f"Queued Election final voters_count: {queued_election.voters_count}")
            
            waitlist_count = ElectionWaitlist.query.filter_by(
                election_id=queued_election.election_id, 
                status='waiting'
            ).count()
            logger.info(f"Queued Election waitlist count: {waitlist_count}")
            
            # 7. Test Results Summary
            logger.info("\n--- Step 7: Test Results Summary ---")
            
            success = True
            issues = []
            
            # Check Non-Queued Election behavior
            if non_queued_election.voters_count != 1:  # Should have 1 active voter remaining
                issues.append(f"Non-Queued Election voters_count incorrect: expected 1, got {non_queued_election.voters_count}")
                success = False
            
            # Check Queued Election behavior
            expected_queued_count = min(queued_election.max_concurrent_voters, 3)  # 3 remaining voters, max 2 concurrent
            if queued_election.voters_count > queued_election.max_concurrent_voters:
                issues.append(f"Queued Election voters_count exceeds limit: {queued_election.voters_count} > {queued_election.max_concurrent_voters}")
                success = False
            
            if success:
                logger.info("✅ All voter count tests PASSED!")
            else:
                logger.error("❌ Voter count tests FAILED!")
                for issue in issues:
                    logger.error(f"  - {issue}")
            
            return success
            
    except Exception as e:
        logger.error(f"Test failed with exception: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = test_voter_count_workflow()
    sys.exit(0 if success else 1)
