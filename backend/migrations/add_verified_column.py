"""Add verified column to election_results table

Revision ID: a4f9c7b24e1d
Revises: # Add the previous revision ID here
Create Date: 2023-11-15 10:30:00.000000

This migration adds a 'verified' column to the election_results table
to track whether the decrypted results have been cryptographically verified
as matching the original encrypted votes.
"""

import logging
from alembic import op
import sqlalchemy as sa
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Setup logging
logger = logging.getLogger('alembic.migration')

# Revision identifiers
revision = 'a4f9c7b24e1d'
down_revision = None  # Update with the actual previous revision ID

Base = declarative_base()
Session = sessionmaker()

def upgrade():
    """
    Add verified column to election_results table.
    This column tracks whether the decrypted vote tallies have been
    cryptographically verified against the original encrypted votes.
    """
    try:
        # Check if column already exists to avoid errors
        conn = op.get_bind()
        inspector = sa.inspect(conn)
        columns = [c['name'] for c in inspector.get_columns('election_results')]
        
        if 'verified' not in columns:
            logger.info("Adding 'verified' column to election_results table")
            op.add_column('election_results', 
                sa.Column('verified', sa.Boolean(), 
                          nullable=True, 
                          server_default='false',
                          comment='Indicates if the decrypted result has been cryptographically verified'))
            
            # Initialize existing records
            try:
                # Create a session
                session = Session(bind=conn)
                
                # Set all existing records to unverified
                session.execute(
                    sa.text("UPDATE election_results SET verified = false WHERE verified IS NULL")
                )
                session.commit()
                logger.info("Successfully initialized existing records with verified=false")
            except Exception as e:
                logger.warning(f"Error initializing existing records: {e}")
                session.rollback()
        else:
            logger.info("Column 'verified' already exists in election_results table")
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise

def downgrade():
    """
    Remove the verified column from the election_results table.
    """
    try:
        # Check if column exists before attempting to drop
        conn = op.get_bind()
        inspector = sa.inspect(conn)
        columns = [c['name'] for c in inspector.get_columns('election_results')]
        
        if 'verified' in columns:
            logger.info("Removing 'verified' column from election_results table")
            op.drop_column('election_results', 'verified')
        else:
            logger.info("Column 'verified' not found in election_results table")
    except Exception as e:
        logger.error(f"Downgrade failed: {e}")
        raise
