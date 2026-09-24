"""Each account owns its vocabulary."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_users"
down_revision: Union[str, None] = "002_word_last_grade"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

WORD_COLUMNS = (
    "id",
    "term",
    "term_key",
    "translation",
    "definition",
    "example",
    "notes",
    "part_of_speech",
    "status",
    "created_at",
    "difficulty",
    "review_count",
    "success_count",
    "last_reviewed_at",
    "next_review_at",
    "interval_days",
    "last_grade",
)


def _words_table(include_user: bool) -> sa.Table:
    columns: list[sa.Column] = [
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("term", sa.String(200), nullable=False),
        sa.Column("term_key", sa.String(200), nullable=False),
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
        sa.Column("last_grade", sa.String(16), nullable=True),
    ]
    constraints: list[sa.Constraint] = []
    if include_user:
        columns.append(sa.Column("user_id", sa.String(40), nullable=True))
        constraints.append(sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_words_user_id", ondelete="CASCADE"))
        constraints.append(sa.UniqueConstraint("user_id", "term_key", name="uq_word_user_term"))
    else:
        constraints.append(sa.UniqueConstraint("term_key", name="uq_word_term_key"))
    return sa.Table("words_new", sa.MetaData(), *columns, *constraints)


def _rebuild_words_sqlite(include_user: bool) -> None:
    op.execute(sa.text("PRAGMA foreign_keys=OFF"))
    table = _words_table(include_user)
    op.create_table(
        table.name,
        *[column.copy() for column in table.columns],
        *table.constraints,
    )
    selected = ", ".join(WORD_COLUMNS)
    target = selected + (", user_id" if include_user else "")
    source = selected + (", NULL" if include_user else "")
    op.execute(sa.text(f"INSERT INTO words_new ({target}) SELECT {source} FROM words"))
    op.drop_table("words")
    op.rename_table("words_new", "words")
    op.execute(sa.text("PRAGMA foreign_keys=ON"))


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("daily_goal", sa.Integer(), nullable=False),
        sa.Column("streak_days", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("email", name="uq_user_email"),
    )
    for table in ("sentences", "songs", "decks"):
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column("user_id", sa.String(40), nullable=True))
            batch.create_foreign_key(f"fk_{table}_user_id", "users", ["user_id"], ["id"], ondelete="CASCADE")

    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        _rebuild_words_sqlite(include_user=True)
        return

    op.add_column("words", sa.Column("user_id", sa.String(40), nullable=True))
    op.create_foreign_key("fk_words_user_id", "words", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.drop_constraint("words_term_key_key", "words", type_="unique")
    op.create_unique_constraint("uq_word_user_term", "words", ["user_id", "term_key"])


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        op.execute(sa.text("PRAGMA foreign_keys=OFF"))
        table = _words_table(include_user=False)
        op.create_table(
            table.name,
            *[column.copy() for column in table.columns],
            *table.constraints,
        )
        selected = ", ".join(WORD_COLUMNS)
        op.execute(sa.text(f"INSERT INTO words_new ({selected}) SELECT {selected} FROM words"))
        op.drop_table("words")
        op.rename_table("words_new", "words")
        op.execute(sa.text("PRAGMA foreign_keys=ON"))
    else:
        op.drop_constraint("uq_word_user_term", "words", type_="unique")
        op.drop_constraint("fk_words_user_id", "words", type_="foreignkey")
        op.drop_column("words", "user_id")
        op.create_unique_constraint("words_term_key_key", "words", ["term_key"])

    for table in ("decks", "songs", "sentences"):
        with op.batch_alter_table(table) as batch:
            batch.drop_constraint(f"fk_{table}_user_id", type_="foreignkey")
            batch.drop_column("user_id")
    op.drop_table("users")
