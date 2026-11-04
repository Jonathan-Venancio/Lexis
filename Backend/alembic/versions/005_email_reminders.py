"""Store email reminder times for each account."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_email_reminders"
down_revision: Union[str, None] = "004_streak_last_study"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("timezone", sa.String(64), nullable=False, server_default=sa.text("'UTC'")))
    op.add_column("users", sa.Column("locale", sa.String(8), nullable=False, server_default=sa.text("'pt'")))
    op.add_column("users", sa.Column("email_reminders", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("reminder_time", sa.String(5), nullable=False, server_default=sa.text("'19:00'")))
    op.add_column("users", sa.Column("reminder_late_time", sa.String(5), nullable=True))
    op.add_column("users", sa.Column("reminder_sent_on", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("reminder_late_sent_on", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "reminder_late_sent_on")
    op.drop_column("users", "reminder_sent_on")
    op.drop_column("users", "reminder_late_time")
    op.drop_column("users", "reminder_time")
    op.drop_column("users", "email_reminders")
    op.drop_column("users", "locale")
    op.drop_column("users", "timezone")
