"""Add key_type column to crypto_configs

Revision ID: 20240518_add_key_type
Revises: 20240515_waitlist
Create Date: 2024-05-18 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20240518_add_key_type'
down_revision = '20240515_waitlist'
branch_labels = None
depends_on = None


def upgrade():
    # Add key_type column
    op.add_column('crypto_configs', sa.Column('key_type', sa.String(50), nullable=True))
    
    # Add status column if it doesn't exist
    op.execute("SELECT column_name FROM information_schema.columns WHERE table_name='crypto_configs' AND column_name='status'")
    result = op.get_bind().fetchone()
    if not result:
        op.add_column('crypto_configs', sa.Column('status', sa.String(20), nullable=True, server_default='active'))


def downgrade():
    # Remove the columns in reverse order
    op.drop_column('crypto_configs', 'key_type')
