from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'provider_aggregate',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('org_id', sa.Integer, nullable=False, index=True),
        sa.Column('provider_id', sa.Integer, nullable=False, index=True),
        sa.Column('period', sa.String(length=32), nullable=False, index=True),
        sa.Column('total_amount', sa.Float, nullable=False),
        sa.Column('avg_amount', sa.Float, nullable=False),
        sa.Column('n_claims', sa.Integer, nullable=False),
        sa.Column('industry', sa.String(length=128), nullable=True),
        sa.Column('region', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        'provider_outlier',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('org_id', sa.Integer, nullable=False, index=True),
        sa.Column('provider_id', sa.Integer, nullable=False, index=True),
        sa.Column('period', sa.String(length=32), nullable=False, index=True),
        sa.Column('score', sa.Float, nullable=False),
        sa.Column('details', sa.dialects.postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('provider_outlier')
    op.drop_table('provider_aggregate')
