"""Remember the review button chosen for each word."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_word_last_grade"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("words", sa.Column("last_grade", sa.String(16), nullable=True))


def downgrade() -> None:
    op.drop_column("words", "last_grade")
