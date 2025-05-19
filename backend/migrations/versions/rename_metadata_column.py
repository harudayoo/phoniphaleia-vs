"""Rename metadata to meta_data in CryptoConfig

Revision ID: 2024051801
Revises: 
Create Date: 2024-05-18 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2024051801'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Rename column metadata to meta_data
    op.alter_column('crypto_configs', 'metadata', new_column_name='meta_data')


def downgrade():
    # Revert rename from meta_data back to metadata
    op.alter_column('crypto_configs', 'meta_data', new_column_name='metadata')
