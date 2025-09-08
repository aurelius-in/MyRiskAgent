from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create extension if supported (pgvector)
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    except Exception:
        pass

    op.create_table(
        'document',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('org_id', sa.Integer, nullable=False, index=True),
        sa.Column('source_id', sa.Integer, nullable=True),
        sa.Column('title', sa.String(length=512), nullable=True),
        sa.Column('url', sa.String(length=2048), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('embedding', sa.dialects.postgresql.ARRAY(sa.Float), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_index('ix_document_url', 'document', ['url'])
    op.create_index('ix_document_org', 'document', ['org_id'])


def downgrade() -> None:
    op.drop_index('ix_document_org', table_name='document')
    op.drop_index('ix_document_url', table_name='document')
    op.drop_table('document')
