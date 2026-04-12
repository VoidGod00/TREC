"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_verified', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=False),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Transactions
    op.create_table(
        'transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('merchant', sa.String(255), nullable=True),
        sa.Column('is_recurring', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('tags', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_transactions_id', 'transactions', ['id'])
    op.create_index('ix_transactions_user_id', 'transactions', ['user_id'])
    op.create_index('ix_transactions_category', 'transactions', ['category'])
    op.create_index('ix_transactions_type', 'transactions', ['type'])
    op.create_index('ix_transactions_date', 'transactions', ['date'])

    # Budgets
    op.create_table(
        'budgets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('limit_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_budgets_id', 'budgets', ['id'])
    op.create_index('ix_budgets_user_id', 'budgets', ['user_id'])

    # AI Logs
    op.create_table(
        'ai_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('response', sa.Text(), nullable=False),
        sa.Column('model_used', sa.String(100), nullable=False),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ai_logs_id', 'ai_logs', ['id'])
    op.create_index('ix_ai_logs_user_id', 'ai_logs', ['user_id'])


def downgrade() -> None:
    op.drop_table('ai_logs')
    op.drop_table('budgets')
    op.drop_table('transactions')
    op.drop_table('users')
