"""Initial Lexis schema."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "words",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("term", sa.String(200), nullable=False),
        sa.Column("term_key", sa.String(200), nullable=False, unique=True),
        sa.Column("translation", sa.String(400), nullable=False),
        sa.Column("definition", sa.Text(), nullable=False),
        sa.Column("example", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("part_of_speech", sa.String(32), nullable=True),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("difficulty", sa.Float(), nullable=False),
        sa.Column("review_count", sa.Integer(), nullable=False),
        sa.Column("success_count", sa.Integer(), nullable=False),
        sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_review_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("interval_days", sa.Integer(), nullable=False),
    )
    op.create_table(
        "sentences",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("translation", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "songs",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("artist", sa.String(300), nullable=False),
        sa.Column("album", sa.String(300), nullable=True),
        sa.Column("url", sa.String(500), nullable=True),
        sa.Column("lyrics", sa.Text(), nullable=False),
        sa.Column("my_translation", sa.Text(), nullable=False),
        sa.Column("reference_translation", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "decks",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "deck_words",
        sa.Column("deck_id", sa.String(40), sa.ForeignKey("decks.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("word_id", sa.String(40), sa.ForeignKey("words.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.UniqueConstraint("deck_id", "word_id", name="uq_deck_word"),
    )
    op.create_table(
        "profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("daily_goal", sa.Integer(), nullable=False),
        sa.Column("streak_days", sa.Integer(), nullable=False),
    )
    op.bulk_insert(
        sa.table(
            "profiles",
            sa.column("id", sa.Integer),
            sa.column("name", sa.String),
            sa.column("daily_goal", sa.Integer),
            sa.column("streak_days", sa.Integer),
        ),
        [{"id": 1, "name": "", "daily_goal": 10, "streak_days": 0}],
    )


def downgrade() -> None:
    op.drop_table("profiles")
    op.drop_table("deck_words")
    op.drop_table("decks")
    op.drop_table("songs")
    op.drop_table("sentences")
    op.drop_table("words")
