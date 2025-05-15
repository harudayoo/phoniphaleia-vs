"""
Migration script to add queued_access and max_concurrent_voters to elections table,
and create the election_waitlist table.
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('elections', sa.Column('queued_access', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('elections', sa.Column('max_concurrent_voters', sa.Integer(), nullable=True))
    op.create_table(
        'election_waitlist',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('election_id', sa.Integer, sa.ForeignKey('elections.election_id'), nullable=False),
        sa.Column('voter_id', sa.String(10), sa.ForeignKey('voters.student_id'), nullable=False),
        sa.Column('joined_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('status', sa.String(20), default='waiting')
    )

def downgrade():
    op.drop_table('election_waitlist')
    op.drop_column('elections', 'queued_access')
    op.drop_column('elections', 'max_concurrent_voters')
