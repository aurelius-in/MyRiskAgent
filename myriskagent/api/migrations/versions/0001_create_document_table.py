from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Try to create table with pgvector embedding type first
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        op.execute(
            """
            CREATE TABLE document (
              id SERIAL PRIMARY KEY,
              org_id INTEGER NOT NULL,
              source_id INTEGER NULL,
              title VARCHAR(512) NULL,
              url VARCHAR(2048) NULL,
              published_at TIMESTAMP NULL,
              content TEXT NULL,
              embedding VECTOR(1536) NULL,
              created_at TIMESTAMP NOT NULL DEFAULT now()
            );
            """
        )
        op.create_index('ix_document_url', 'document', ['url'])
        op.create_index('ix_document_org', 'document', ['org_id'])
        return
    except Exception:
        # Fallback: create with float[] embedding (reindex/alter to vector later if needed)
        pass

    op.create_table(
        'document',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('org_id', sa.Integer, nullable=False),
        sa.Column('source_id', sa.Integer, nullable=True),
        sa.Column('title', sa.String(length=512), nullable=True),
        sa.Column('url', sa.String(length=2048), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('embedding', sa.ARRAY(sa.Float), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_document_url', 'document', ['url'])
    op.create_index('ix_document_org', 'document', ['org_id'])


def downgrade() -> None:
    op.drop_index('ix_document_org', table_name='document')
    op.drop_index('ix_document_url', table_name='document')
    op.drop_table('document')
