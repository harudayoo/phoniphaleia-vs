"""add archived_results table

Revision ID: 65a87de2f921
Revises: <previous_revision_id>
Create Date: 2025-05-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '65a87de2f921'
down_revision = None  # replace with the actual previous revision ID
branch_labels = None
depends_on = None


def upgrade():
    # Create archived_results table
    op.create_table('archived_results',
        sa.Column('archive_id', sa.Integer(), nullable=False),
        sa.Column('result_id', sa.Integer(), nullable=True),
        sa.Column('election_id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.Integer(), nullable=False),
        sa.Column('encrypted_vote_total', sa.Text(), nullable=True),
        sa.Column('vote_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.Column('verified', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('archive_id'),
        sa.UniqueConstraint('election_id', 'candidate_id', name='unique_archived_election_candidate')
    )


def downgrade():
    # Drop archived_results table
    op.drop_table('archived_results')
