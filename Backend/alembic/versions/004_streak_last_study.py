"""Remember the last local day that counted for the streak."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_streak_last_study"
down_revision: Union[str, None] = "003_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_study_on", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_study_on")
