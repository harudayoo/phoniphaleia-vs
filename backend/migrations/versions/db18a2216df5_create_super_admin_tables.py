"""Create super admin and pending admin tables

Revision ID: db18a2216df5
Revises: db08a0816cf3
Create Date: 2025-05-25

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'db18a2216df5'
down_revision = 'db08a0816cf3'
branch_labels = None
depends_on = None

def upgrade():
    # Add role column to admin table
    op.add_column('admin', sa.Column('role', sa.String(20), server_default='admin'))
    op.add_column('admin', sa.Column('last_login', sa.DateTime(timezone=True), nullable=True))
    
    # Create super_admin table
    op.create_table('super_admin',
        sa.Column('super_admin_id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('id_number', sa.String(length=10), nullable=False),
        sa.Column('lastname', sa.String(length=100), nullable=False),
        sa.Column('firstname', sa.String(length=100), nullable=False),
        sa.Column('middlename', sa.String(length=100)),
        sa.Column('username', sa.String(length=50), unique=True, nullable=False),
        sa.Column('password', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('otp_code', sa.String(length=6), nullable=True),
        sa.Column('otp_expires_at', sa.DateTime(), nullable=True),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True)
    )
    
    # Create pending_admin table
    op.create_table('pending_admin',
        sa.Column('pending_id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('id_number', sa.String(length=10), nullable=False),
        sa.Column('lastname', sa.String(length=100), nullable=False),
        sa.Column('firstname', sa.String(length=100), nullable=False),
        sa.Column('middlename', sa.String(length=100)),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('password', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=20), default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('notes', sa.Text(), nullable=True)
    )
    
    # Create a default super-admin account
    op.execute("""
        INSERT INTO super_admin (
            email, id_number, lastname, firstname, username, password, role
        ) VALUES (
            'super_admin@usep.edu.ph', '2025-00000', 'System', 'Super Admin', 'superadmin', 
            '$2b$12$FGBzgRnGkB91vEfvf0xhpedDPbRLXCcDkJO/7Z6V5UMR2QuZlGV0e', 'super_admin'
        )
    """)  # Password is 'SuperAdmin@123'

def downgrade():
    # Drop tables
    op.drop_table('pending_admin')
    op.drop_table('super_admin')
    
    # Remove role column from admin table
    op.drop_column('admin', 'role')
    op.drop_column('admin', 'last_login')
