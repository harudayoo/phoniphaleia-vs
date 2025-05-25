"""Add role column to admin table

Revision ID: add_role_column_to_admin
Revises: db18a2216df5
Create Date: 2025-05-25 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_role_column_to_admin'
down_revision = 'db18a2216df5'
branch_labels = None
depends_on = None


def upgrade():
    # Add role column with default value of 'admin'
    op.add_column('admin', sa.Column('role', sa.String(length=20), nullable=False, server_default='admin'))


def downgrade():
    # Remove role column
    op.drop_column('admin', 'role')
