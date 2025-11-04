"""Add refresh_tokens table for token rotation

Revision ID: a1b2c3d4e5f6
Revises: bfd028ba583f
Create Date: 2025-10-30 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'bfd028ba583f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add refresh_tokens table."""
    op.create_table(
        'refresh_tokens',
        sa.Column('id', mysql.CHAR(charset='utf8mb4', collation='utf8mb4_bin', length=36), nullable=False, comment='Unique token identifier'),
        sa.Column('user_id', mysql.CHAR(charset='utf8mb4', collation='utf8mb4_bin', length=36), nullable=False, comment='Associated user ID'),
        sa.Column('token_hash', sa.String(length=64), nullable=False, comment='SHA256 hash of the refresh token'),
        sa.Column('family_id', mysql.CHAR(charset='utf8mb4', collation='utf8mb4_bin', length=36), nullable=False, comment='Token family ID for rotation chain'),
        sa.Column('expires_at', sa.DateTime(), nullable=False, comment='Token expiration timestamp'),
        sa.Column('is_revoked', sa.Boolean(), nullable=False, server_default='0', comment='Whether token has been revoked'),
        sa.Column('revoked_at', sa.DateTime(), nullable=True, comment='When token was revoked'),
        sa.Column('created_at', sa.DateTime(), nullable=False, comment='When token was issued'),
        sa.Column('used_at', sa.DateTime(), nullable=True, comment='When token was used for refresh'),
        sa.Column('created_from_ip', sa.String(length=45), nullable=True, comment='IP address where token was created'),
        sa.Column('user_agent', sa.String(length=255), nullable=True, comment='User agent of client that created token'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for performance
    op.create_index(op.f('ix_refresh_tokens_user_id'), 'refresh_tokens', ['user_id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_token_hash'), 'refresh_tokens', ['token_hash'], unique=True)
    op.create_index(op.f('ix_refresh_tokens_family_id'), 'refresh_tokens', ['family_id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_expires_at'), 'refresh_tokens', ['expires_at'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_is_revoked'), 'refresh_tokens', ['is_revoked'], unique=False)


def downgrade() -> None:
    """Downgrade schema - remove refresh_tokens table."""
    op.drop_index(op.f('ix_refresh_tokens_is_revoked'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_expires_at'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_family_id'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_token_hash'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_user_id'), table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
